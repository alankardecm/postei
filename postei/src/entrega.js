import fs from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync, crc32 as crc32nativo } from 'node:zlib';

/**
 * Zip de entrega do lote: imagens (e vídeo, se houver) + LEGENDAS.txt.
 *
 * Sem dependência nova — o formato ZIP com deflate cabe em poucas dezenas
 * de linhas, e o assinante não precisa ter o Python do empacotar-entrega.
 *
 * Só entra o que o pacote.json aponta. Backup, origem de foto e o JSON
 * interno ficam de fora.
 */

const MENCAO_MARCA = 'Siga o Postei: @cliqueipostei.app';

function crc32(buf) {
  if (typeof crc32nativo === 'function') return crc32nativo(buf) >>> 0;
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

function montarZip(entradas) {
  const locais = [];
  const centrais = [];
  let offset = 0;

  for (const e of entradas) {
    const nome = Buffer.from(e.nome, 'utf8');
    const raw = Buffer.isBuffer(e.dados) ? e.dados : Buffer.from(e.dados);
    const compactado = deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compactado.length),
      u32(raw.length),
      u16(nome.length),
      u16(0),
      nome,
      compactado,
    ]);
    locais.push(local);

    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compactado.length),
      u32(raw.length),
      u16(nome.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nome,
    ]);
    centrais.push(central);
    offset += local.length;
  }

  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(entradas.length),
    u16(entradas.length),
    u32(diretorio.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...locais, diretorio, fim]);
}

function jaMenciona(texto) {
  return /@cliqueipostei\.app\b/i.test(String(texto || ''));
}

function blocoLegenda(post, { mencionarMarca, linkedin = false }) {
  const linhas = [];
  const texto = linkedin
    ? post.legendaLinkedin || post.textoParaColarLinkedin || post.legenda
    : post.legenda;
  if (texto) linhas.push(String(texto).trim());
  if (post.cta) linhas.push('', String(post.cta).trim());
  if (mencionarMarca && !linkedin && !jaMenciona(`${texto}\n${post.cta || ''}`)) {
    linhas.push('', MENCAO_MARCA);
  }
  if (post.fonte?.titulo) {
    linhas.push(
      '',
      `Fonte: ${post.fonte.titulo} (${post.fonte.revista}, ${post.fonte.ano}) — ${post.fonte.url}`,
    );
  }
  const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
  const usadas = linkedin ? tags.slice(0, 5) : tags;
  if (usadas.length) linhas.push('', usadas.map((h) => `#${String(h).replace(/^#/, '')}`).join(' '));
  return linhas.join('\n');
}

export function montarLegendas(pacote, { linkedin = false } = {}) {
  const mencionarMarca = pacote?.nicho?.id === 'postei-marca';
  const linhas = [
    `LEGENDAS — ${pacote.nicho?.nome || 'Postei'}`,
    `Perfil: ${pacote.marca || ''}`,
    `Gerado em ${String(pacote.geradoEm || '').slice(0, 10)}`,
    linkedin ? 'Rede: LinkedIn' : 'Rede: Instagram',
    '',
    'Cada bloco corresponde ao arquivo de mesmo número.',
    'Copie da legenda até a última hashtag e cole na rede.',
    '='.repeat(68),
    '',
  ];

  for (const [i, post] of (pacote.posts || []).entries()) {
    const n = String(i + 1).padStart(2, '0');
    const slides = !linkedin && Array.isArray(post.imagens) && post.imagens.length > 1
      ? post.imagens
      : null;
    const arquivo = slides
      ? `${n}-01.jpg … ${n}-${String(slides.length).padStart(2, '0')}.jpg`
      : `${n}.jpg`;
    linhas.push(`${arquivo}  [${post.formato || 'post'}]`);
    linhas.push('-'.repeat(68));
    linhas.push(blocoLegenda(post, { mencionarMarca, linkedin }));
    if (post.formato === 'foto' && post.foto?.autor) {
      linhas.push('', `[foto: ${post.foto.autor} / Pexels]`);
    }
    linhas.push('', '');
  }

  return `${linhas.join('\n')}\n`;
}

export function nomeDoZip(pacote) {
  const marca = String(pacote.marca || 'marca')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'marca';
  const data = String(pacote.geradoEm || '').slice(0, 10) || 'lote';
  return `postei-${marca}-${data}.zip`;
}

function seguro(nome) {
  const limpo = String(nome || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!limpo || limpo.includes('..')) return null;
  return limpo;
}

async function lerSeExistir(dir, arquivo) {
  const nome = seguro(arquivo);
  if (!nome) return null;
  try {
    return await fs.readFile(path.join(dir, nome));
  } catch {
    return null;
  }
}

/**
 * Monta o zip em memória. 30 posts JPEG cabem folgado; não grava no disco
 * para não deixar lixo em /opt/postei/saida entre downloads.
 */
export async function montarEntrega(dir, pacote) {
  const entradas = [];
  const rede = pacote.rede || 'instagram';
  const comIg = rede !== 'linkedin';
  const comLi = rede === 'linkedin' || rede === 'ambos';
  const pastaIg = comIg && comLi ? 'instagram/' : '';
  const pastaLi = comIg && comLi ? 'linkedin/' : '';

  for (const [i, post] of (pacote.posts || []).entries()) {
    const n = String(i + 1).padStart(2, '0');

    if (comIg) {
      const slides = Array.isArray(post.imagens) && post.imagens.length > 1 ? post.imagens : null;
      if (slides) {
        for (const [s, arq] of slides.entries()) {
          const bytes = await lerSeExistir(dir, arq);
          if (bytes) {
            entradas.push({
              nome: `${pastaIg}${n}-${String(s + 1).padStart(2, '0')}.jpg`,
              dados: bytes,
            });
          }
        }
      } else {
        const bytes = await lerSeExistir(dir, post.imagem);
        if (bytes) entradas.push({ nome: `${pastaIg}${n}.jpg`, dados: bytes });
      }
      if (post.video) {
        const vid = await lerSeExistir(dir, post.video);
        if (vid) entradas.push({ nome: `${pastaIg}${n}.mp4`, dados: vid });
      }
    }

    if (comLi) {
      const slidesLi =
        Array.isArray(post.imagensLinkedin) && post.imagensLinkedin.length > 1
          ? post.imagensLinkedin
          : null;
      if (slidesLi) {
        for (const [s, arq] of slidesLi.entries()) {
          const bytes = await lerSeExistir(dir, arq);
          if (bytes) {
            entradas.push({
              nome: `${pastaLi}${n}-${String(s + 1).padStart(2, '0')}.jpg`,
              dados: bytes,
            });
          }
        }
      } else {
        const arqLi = post.imagemLinkedin || (rede === 'linkedin' ? post.imagem : null);
        const bytes = arqLi ? await lerSeExistir(dir, arqLi) : null;
        if (bytes) entradas.push({ nome: `${pastaLi}${n}.jpg`, dados: bytes });
      }
    }
  }

  if (comIg) entradas.push({ nome: `${pastaIg}LEGENDAS.txt`, dados: montarLegendas(pacote) });
  if (comLi) {
    entradas.push({
      nome: `${pastaLi}LEGENDAS.txt`,
      dados: montarLegendas(pacote, { linkedin: true }),
    });
  }

  if (entradas.length === 0) {
    const erro = new Error('Este pacote não tem arquivo para baixar.');
    erro.codigo = 404;
    throw erro;
  }

  return montarZip(entradas);
}
