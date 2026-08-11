import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { carregarNicho } from './nichos.js';
import { gerarCriativo, gerarCarrossel } from './criativo.js';
import { buscarFoto, prepararFotoDeBytes } from './foto.js';
import { dnaDaMarca } from './banco.js';
import { paletaDaMarca } from './paleta.js';
import { pastaDoAssinante } from './gerador.js';

/**
 * Re-renderiza a arte de UM post do pacote com nova foto (upload ou Pexels).
 *
 * Nao chama LLM: o texto (titulo, slides, legenda) permanece. So a imagem
 * muda. Antes de sobrescrever, grava backup em _backup_arte_<timestamp>/.
 */

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function higienizarLoteId(loteId) {
  return String(loteId).replace(/[^a-zA-Z0-9._-]/g, '');
}

function dirLote(assinanteId, loteId) {
  return path.join(config.saida, pastaDoAssinante(assinanteId), higienizarLoteId(loteId));
}

/**
 * Copia pacote.json + imagens atuais do post para pasta de backup.
 * Assim da para desfazer a troca de arte sem git.
 */
async function backupDoPost(dir, post) {
  const nome = `_backup_arte_${Date.now()}`;
  const destino = path.join(dir, nome);
  await fs.mkdir(destino, { recursive: true });

  await fs.copyFile(path.join(dir, 'pacote.json'), path.join(destino, 'pacote.json'));

  const arquivos = new Set();
  if (post.imagem) arquivos.add(post.imagem);
  if (Array.isArray(post.imagens)) post.imagens.forEach((a) => arquivos.add(a));
  if (post.origemFoto) arquivos.add(post.origemFoto);

  for (const arq of arquivos) {
    if (!arq || arq.includes('..') || arq.includes('/') || arq.includes('\\')) continue;
    try {
      await fs.copyFile(path.join(dir, arq), path.join(destino, arq));
    } catch {
      // arquivo ausente nao impede o resto
    }
  }

  return nome;
}

async function limparBackupsAntigos(dir, manter = 5) {
  try {
    const itens = await fs.readdir(dir);
    const backups = itens
      .filter((n) => n.startsWith('_backup_arte_'))
      .sort()
      .reverse();
    for (const velho of backups.slice(manter)) {
      await fs.rm(path.join(dir, velho), { recursive: true, force: true });
    }
  } catch {
    // best-effort
  }
}

/**
 * @param {{
 *   assinanteId: string,
 *   loteId: string,
 *   indice: number,
 *   fonte: 'pexels' | 'upload',
 *   imagemBase64?: string,
 * }} opts
 */
export async function refazerArte({ assinanteId, loteId, indice, fonte, imagemBase64 }) {
  const dir = dirLote(assinanteId, loteId);
  const alvoPacote = path.join(dir, 'pacote.json');

  let pacote;
  try {
    pacote = JSON.parse(await fs.readFile(alvoPacote, 'utf8'));
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      const e = new Error('Lote não encontrado.');
      e.codigo = 404;
      throw e;
    }
    throw erro;
  }

  const post = pacote.posts?.[indice];
  if (!post) {
    const e = new Error('Post não encontrado.');
    e.codigo = 404;
    throw e;
  }

  let foto;
  if (fonte === 'upload') {
    if (!imagemBase64 || typeof imagemBase64 !== 'string') {
      const e = new Error('Envie a imagem em base64.');
      e.codigo = 400;
      throw e;
    }
    // Aceita com ou sem prefixo data:image/...;base64,
    const puro = imagemBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    let bytes;
    try {
      bytes = Buffer.from(puro, 'base64');
    } catch {
      const e = new Error('Imagem base64 inválida.');
      e.codigo = 400;
      throw e;
    }
    if (bytes.length > MAX_UPLOAD_BYTES) {
      const e = new Error('A foto pode ter no máximo 8 MB.');
      e.codigo = 400;
      throw e;
    }
    if (bytes.length < 100) {
      const e = new Error('Arquivo de imagem vazio ou corrompido.');
      e.codigo = 400;
      throw e;
    }
    foto = await prepararFotoDeBytes(bytes, { autor: null, origem: 'upload' });
    if (!foto) {
      const e = new Error('Não consegui ler essa imagem. Use JPEG, PNG ou WebP.');
      e.codigo = 400;
      throw e;
    }
  } else if (fonte === 'pexels') {
    const consulta = post.buscaImagem || post.titulo;
    foto = await buscarFoto({ consulta, ignorarCache: true });
    if (!foto) {
      const e = new Error(
        'Não achei outra foto no banco para este tema. Tente enviar a sua.',
      );
      e.codigo = 422;
      throw e;
    }
  } else {
    const e = new Error("fonte deve ser 'pexels' ou 'upload'.");
    e.codigo = 400;
    throw e;
  }

  const nichoId = pacote.nicho?.id;
  if (!nichoId) {
    const e = new Error('Pacote sem nicho — não dá para re-renderizar.');
    e.codigo = 500;
    throw e;
  }

  const nicho = await carregarNicho(nichoId);
  const marca = pacote.marca || 'marca';
  // Mesma regra da geração: DNA da marca manda na paleta quando existir.
  const dna = await dnaDaMarca(assinanteId, marca);
  const paleta = paletaDaMarca(nicho, dna);

  const backup = await backupDoPost(dir, post);

  const numero = String(indice + 1).padStart(2, '0');
  // Guarda a foto original do assinante (se upload) para auditoria / re-uso.
  let origemFoto = post.origemFoto || null;
  if (fonte === 'upload' && foto.bytes) {
    origemFoto = `origem-${numero}.jpg`;
    await fs.writeFile(path.join(dir, origemFoto), foto.bytes);
  }

  // Para re-render, carrossel continua carrossel; lista vira layout com foto
  // (a lista tipografica nao tem area de imagem — o assinante pediu foto).
  const ehCarrossel =
    post.formato === 'carrossel' ||
    (Array.isArray(post.imagens) && post.imagens.length > 1);

  let arquivo;
  let imagens = null;
  let formato;

  if (ehCarrossel) {
    // Garante slides no post: sem miolo o gerador de carrossel fica pobre.
    const postCarrossel = {
      ...post,
      formato: 'carrossel',
      slides:
        Array.isArray(post.slides) && post.slides.length >= 2
          ? post.slides
          : [
              { titulo: post.titulo, texto: post.subtitulo || post.legenda?.slice(0, 120) || '' },
              { titulo: 'Na prática', texto: post.cta || post.legenda?.slice(0, 120) || '' },
            ],
    };
    const r = await gerarCarrossel({ post: postCarrossel, nicho, marca, foto, paleta });
    formato = r.formato;
    imagens = [];
    for (const [s, img] of r.imagens.entries()) {
      const nome = `post-${numero}-${String(s + 1).padStart(2, '0')}.${r.extensao}`;
      await fs.writeFile(path.join(dir, nome), img);
      imagens.push(nome);
    }
    arquivo = imagens[0];
  } else {
    // Força layout com foto: citacao/destaque/lista + foto viram "foto".
    const postUnico = { ...post, formato: post.formato === 'lista' ? 'destaque' : post.formato };
    const r = await gerarCriativo({ post: postUnico, nicho, marca, foto, paleta });
    formato = r.formato;
    arquivo = `post-${numero}.${r.extensao}`;
    await fs.writeFile(path.join(dir, arquivo), r.imagem);
    imagens = null;
  }

  post.formato = formato;
  post.imagem = arquivo;
  post.imagens = imagens;
  post.origemFoto = origemFoto;
  post.foto = {
    autor: foto.autor,
    origem: foto.origem || (fonte === 'upload' ? 'upload' : null),
    fonte,
  };
  post.arteRefeitaEm = new Date().toISOString();
  post.arteBackup = backup;

  await fs.writeFile(alvoPacote, JSON.stringify(pacote, null, 2), 'utf8');
  await limparBackupsAntigos(dir);

  return { post, backup };
}

/**
 * Grava um MP4 no post (Fase 2). Nao gera video — so armazena o arquivo
 * do assinante para publicar como Reel.
 */
export async function gravarVideoPost({
  assinanteId,
  loteId,
  indice,
  videoBase64,
}) {
  const MAX = 80 * 1024 * 1024;
  const dir = dirLote(assinanteId, loteId);
  const alvoPacote = path.join(dir, 'pacote.json');

  let pacote;
  try {
    pacote = JSON.parse(await fs.readFile(alvoPacote, 'utf8'));
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      const e = new Error('Lote não encontrado.');
      e.codigo = 404;
      throw e;
    }
    throw erro;
  }

  const post = pacote.posts?.[indice];
  if (!post) {
    const e = new Error('Post não encontrado.');
    e.codigo = 404;
    throw e;
  }

  if (!videoBase64 || typeof videoBase64 !== 'string') {
    const e = new Error('Envie o vídeo em base64.');
    e.codigo = 400;
    throw e;
  }

  const puro = videoBase64.replace(/^data:video\/[a-zA-Z0-9.+-]+;base64,/, '');
  let bytes;
  try {
    bytes = Buffer.from(puro, 'base64');
  } catch {
    const e = new Error('Vídeo base64 inválido.');
    e.codigo = 400;
    throw e;
  }

  if (bytes.length > MAX) {
    const e = new Error('O vídeo pode ter no máximo 80 MB.');
    e.codigo = 400;
    throw e;
  }
  if (bytes.length < 1000) {
    const e = new Error('Arquivo de vídeo vazio ou corrompido.');
    e.codigo = 400;
    throw e;
  }

  // Assinatura simples de MP4 (ftyp no inicio ou apos 4 bytes de size).
  const head = bytes.subarray(0, 12).toString('ascii');
  if (!head.includes('ftyp') && !bytes.subarray(4, 8).toString('ascii').includes('ftyp')) {
    // Nao bloqueia de forma rigida — alguns MP4 validos variam — so avisa.
    console.warn('[postei] video sem assinatura ftyp tipica; gravando mesmo assim.');
  }

  const numero = String(indice + 1).padStart(2, '0');
  const nome = `video-${numero}.mp4`;

  // Backup do video anterior, se houver.
  if (post.video) {
    try {
      const bdir = path.join(dir, `_backup_video_${Date.now()}`);
      await fs.mkdir(bdir, { recursive: true });
      await fs.copyFile(path.join(dir, post.video), path.join(bdir, post.video));
      await fs.copyFile(alvoPacote, path.join(bdir, 'pacote.json'));
    } catch {
      // best-effort
    }
  }

  await fs.writeFile(path.join(dir, nome), bytes);
  post.video = nome;
  post.videoEm = new Date().toISOString();

  await fs.writeFile(alvoPacote, JSON.stringify(pacote, null, 2), 'utf8');

  return { post };
}
