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

export async function buscarFoto({ consulta, largura, altura }) {
  if (!consulta) return null;

  const chaveCache = consulta.toLowerCase().trim();
  if (cache.has(chaveCache)) return cache.get(chaveCache);

  const url = new URL(ENDPOINT);
  url.searchParams.set('query', consulta);
  url.searchParams.set('per_page', '12');
  url.searchParams.set('orientation', 'portrait');

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

  // Normaliza tudo para JPEG antes de embutir. O banco devolve WebP e PNG
  // conforme o arquivo original, e o satori estoura com
  // "Offset is outside the bounds of the DataView" quando o mime declarado
  // no data URI nao corresponde aos bytes. Redimensionar aqui tambem evita
  // carregar um arquivo de 3000px para renderizar num quadro de 1080.
  try {
    const sharp = (await import('sharp')).default;
    bytes = await sharp(bytes)
      .resize({ width: config.criativo.largura, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (erro) {
    console.warn(`[postei] foto em formato ilegivel, descartando: ${erro.message}`);
    return null;
  }

  const resultado = {
    // O satori aceita data URI direto; assim nao dependemos de rede na
    // hora de renderizar nem vazamos URL externa para dentro da arte.
    dataUri: `data:image/jpeg;base64,${bytes.toString('base64')}`,
    autor: escolhida.photographer || null,
    origem: escolhida.url || null,
    corMedia: escolhida.avg_color || null,
  };

  cache.set(chaveCache, resultado);
  return resultado;
}
