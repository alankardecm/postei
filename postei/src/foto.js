import { config } from './config.js';

/**
 * Busca a foto de fundo do criativo no Pexels.
 *
 * Por que Pexels e nao Openverse/CC: a licenca do Pexels permite uso
 * comercial, permite MODIFICAR (que e o que fazemos ao escrever por cima) e
 * nao exige atribuicao. Ja o acervo Creative Commons traz itens 'by-nd', que
 * proibem obra derivada -- escrever sobre a foto violaria a licenca no
 * material que leva o @ do assinante. Nao vale o risco.
 */

const ENDPOINT = 'https://api.pexels.com/v1/search';

/** Cache em memoria: o mesmo tema costuma se repetir entre lotes. */
const cache = new Map();

/**
 * Normaliza bytes de imagem para JPEG embutivel no satori.
 * Usado tanto pelo Pexels quanto pelo upload do assinante.
 */
export async function prepararFotoDeBytes(bytes, meta = {}) {
  if (!bytes || !bytes.length) return null;

  try {
    const sharp = (await import('sharp')).default;
    const jpeg = await sharp(bytes)
      .rotate() // respeita EXIF do celular
      .resize({ width: config.criativo.largura, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      dataUri: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
      autor: meta.autor ?? null,
      origem: meta.origem ?? null,
      corMedia: meta.corMedia ?? null,
      bytes: jpeg,
    };
  } catch (erro) {
    console.warn(`[postei] foto em formato ilegivel, descartando: ${erro.message}`);
    return null;
  }
}

/**
 * @param {{ consulta: string, ignorarCache?: boolean }} opts
 * ignorarCache=true quando o assinante pede "outra foto" — senao o Map
 * devolveria sempre a mesma imagem da primeira busca do tema.
 */
export async function buscarFoto({ consulta, ignorarCache = false }) {
  if (!consulta) return null;

  const chaveCache = consulta.toLowerCase().trim();
  if (!ignorarCache && cache.has(chaveCache)) return cache.get(chaveCache);

  const url = new URL(ENDPOINT);
  url.searchParams.set('query', consulta);
  url.searchParams.set('per_page', '12');
  url.searchParams.set('orientation', 'portrait');
  // Pagina aleatoria leve: "outra foto" nao cai sempre nos mesmos 8.
  if (ignorarCache) {
    url.searchParams.set('page', String(1 + Math.floor(Math.random() * 3)));
  }

  const cabecalhos = {};
  if (config.foto.apiKey) {
    cabecalhos.Authorization = config.foto.apiKey;
  } else {
    // A API responde sem chave hoje, mas os termos do Pexels exigem uma.
    // Serve para demonstrar; nao para atender assinante pagante.
    console.warn('[postei] PEXELS_API_KEY ausente - modo demonstracao, gere a chave gratuita.');
  }

  let resposta;
  try {
    resposta = await fetch(url, { headers: cabecalhos, signal: AbortSignal.timeout(20000) });
  } catch (erro) {
    console.warn(`[postei] busca de foto falhou (${consulta}): ${erro.message}`);
    return null;
  }

  if (!resposta.ok) {
    console.warn(`[postei] Pexels devolveu HTTP ${resposta.status} para "${consulta}".`);
    return null;
  }

  const dados = await resposta.json();
  const fotos = dados.photos || [];
  if (fotos.length === 0) {
    console.warn(`[postei] nenhuma foto para "${consulta}".`);
    return null;
  }

  // Sorteia entre os primeiros resultados: pegar sempre o primeiro faria
  // assinantes do mesmo nicho receberem a mesma foto no mesmo mes.
  const escolhida = fotos[Math.floor(Math.random() * Math.min(fotos.length, 8))];

  // O 'portrait' do Pexels ja vem em proporcao proxima de 4:5.
  const origem = escolhida.src?.portrait || escolhida.src?.large || escolhida.src?.original;
  if (!origem) return null;

  let bytes;
  try {
    const img = await fetch(origem, { signal: AbortSignal.timeout(25000) });
    if (!img.ok) throw new Error(`HTTP ${img.status}`);
    bytes = Buffer.from(await img.arrayBuffer());
  } catch (erro) {
    console.warn(`[postei] download da foto falhou: ${erro.message}`);
    return null;
  }

  const resultado = await prepararFotoDeBytes(bytes, {
    autor: escolhida.photographer || null,
    origem: escolhida.url || null,
    corMedia: escolhida.avg_color || null,
  });
  if (!resultado) return null;

  // Nao cacheia pedido "outra foto": o assinante quer variedade.
  if (!ignorarCache) cache.set(chaveCache, resultado);
  return resultado;
}
