import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

/**
 * Reel de marca via Imagine (xAI). Só nichos internos.
 *
 * Postei: anima o anúncio já pronto (câmera lenta, texto parado).
 * AM: apresentador do still canônico fala o recado do post em PT-BR.
 */

export const NICHOS_REEL_IA = new Set(['postei-marca', 'am-consultoria']);

const CREME = { r: 244, g: 241, b: 234 };
const CANONICO_AM = path.join(config.raiz, 'assets', 'am', 'canonico.jpg');

export function roteiroDoPost(post) {
  const titulo = String(post.titulo || '').trim().replace(/[.!?]+$/, '');
  const sub = String(post.subtitulo || '').trim();
  const frases = String(post.legenda || '')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 2);
  const corpo = [sub, ...frases].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  let texto = [titulo, corpo].filter(Boolean).join('. ');
  if (texto && !/[.!?]$/.test(texto)) texto += '.';
  const palavras = texto.split(/\s+/).filter(Boolean);
  if (palavras.length > 36) texto = `${palavras.slice(0, 36).join(' ')}.`;
  return texto.replace(/\bA\s+M\b/gi, 'AM');
}

function dataUriJpeg(bytes) {
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
}

async function letterbox9x16(bytes, fundo) {
  const sharp = (await import('sharp')).default;
  return sharp(bytes)
    .resize(1080, 1920, {
      fit: 'contain',
      background: fundo,
    })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

async function chamarXai(caminho, { method = 'GET', corpo = null, timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(`${config.xai.baseUrl}${caminho}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.xai.apiKey}`,
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: ctrl.signal,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error(`Imagine vídeo não respondeu em ${timeoutMs}ms.`);
    }
    throw new Error(`Falha ao contatar api.x.ai: ${erro.message}`);
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resp.ok) {
    const recorte = (dados?.error?.message || texto || '').slice(0, 280);
    const erro = new Error(`xAI vídeo HTTP ${resp.status}: ${recorte || 'sem detalhe'}`);
    if (resp.status === 429) erro.rateLimit = true;
    erro.codigo = resp.status === 429 ? 429 : 502;
    throw erro;
  }
  return dados || {};
}

async function esperarVideo(requestId) {
  const teto = config.xai.timeoutVideoMs;
  const inicio = Date.now();
  while (Date.now() - inicio < teto) {
    await new Promise((r) => setTimeout(r, 5000));
    const dados = await chamarXai(`/videos/${requestId}`, { timeoutMs: 20000 });
    const status = String(dados.status || '').toLowerCase();
    if (status === 'done') {
      const url = dados.video?.url;
      if (!url) throw new Error('Imagine devolveu Reel sem URL.');
      return url;
    }
    if (status === 'failed' || status === 'expired') {
      const detalhe = dados.error?.message || status;
      const erro = new Error(`A geração do Reel falhou (${detalhe}).`);
      erro.codigo = 502;
      throw erro;
    }
  }
  const erro = new Error('A geração do Reel passou do tempo. Tente de novo.');
  erro.codigo = 504;
  throw erro;
}

async function baixarMp4(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) throw new Error(`Download do Reel HTTP ${resp.status}`);
  const bytes = Buffer.from(await resp.arrayBuffer());
  if (bytes.length < 1000) throw new Error('Imagine devolveu MP4 vazio.');
  return bytes;
}

async function gerarEBaixar(corpo) {
  const inicio = await chamarXai('/videos/generations', {
    method: 'POST',
    corpo,
    timeoutMs: 30000,
  });
  const requestId = inicio.request_id;
  if (!requestId) {
    throw new Error('Imagine não devolveu request_id do Reel.');
  }
  const url = await esperarVideo(requestId);
  return baixarMp4(url);
}

function promptPostei() {
  return `Slow cinematic camera push-in only on this finished advertisement poster.
Keep EVERY word, logo, headline and button FROZEN and perfectly sharp.
Do not rewrite, move, crop away or invent any text.
No people speaking. No extra brands. No English on screen.
Portuguese poster stays exactly as it is. Gentle light only.`;
}

function promptAm(roteiro) {
  return `Vertical 9:16 Instagram Reel. The Brazilian man from <IMAGE_1> is the SAME person — keep his face, hair, skin and clothes.
He looks at the camera and SPEAKS Brazilian Portuguese out loud. Lips and gestures match the words. One continuous take.
No English. No burned-in captions. No invented logo. No extra brands.
Say the brand name "AM" as one word together (never letter by letter "A" then "M").

He says EXACTLY this Portuguese, in this order:
"""
${roteiro}
"""

Calm consultant, dark studio or desk. Beginning names the weekly mess, middle says AM Consultoria puts data and process in place, end is a short CTA.`;
}

async function gerarReelPostei(imagemBytes) {
  if (!imagemBytes || imagemBytes.length < 1000) {
    const e = new Error('Este post não tem arte para animar.');
    e.codigo = 400;
    throw e;
  }
  const quadro = await letterbox9x16(imagemBytes, CREME);
  return gerarEBaixar({
    model: config.xai.modeloVideo,
    prompt: promptPostei(),
    image: { url: dataUriJpeg(quadro) },
    duration: 6,
    aspect_ratio: '9:16',
    resolution: '720p',
  });
}

async function gerarReelAm(post) {
  let canonico;
  try {
    canonico = await fs.readFile(CANONICO_AM);
  } catch {
    const e = new Error('Still canônico da AM ausente (assets/am/canonico.jpg).');
    e.codigo = 500;
    throw e;
  }
  const roteiro = roteiroDoPost(post);
  if (roteiro.split(/\s+/).filter(Boolean).length < 6) {
    const e = new Error('O post precisa de título e legenda para o apresentador falar.');
    e.codigo = 400;
    throw e;
  }
  return gerarEBaixar({
    model: config.xai.modeloVideo,
    prompt: promptAm(roteiro),
    reference_images: [{ url: dataUriJpeg(canonico) }],
    duration: 10,
    aspect_ratio: '9:16',
    resolution: '720p',
  });
}

export async function gerarReelIa({ nichoId, post, imagemBytes }) {
  if (!config.xai.apiKey) {
    const e = new Error('XAI_API_KEY ausente — Reel de marca precisa da chave da xAI.');
    e.codigo = 503;
    throw e;
  }
  if (nichoId === 'am-consultoria') return gerarReelAm(post);
  if (nichoId === 'postei-marca') return gerarReelPostei(imagemBytes);
  const e = new Error('Este ramo não gera Reel por IA.');
  e.codigo = 400;
  throw e;
}
