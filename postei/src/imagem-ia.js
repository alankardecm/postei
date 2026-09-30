import { config } from './config.js';
import { TELAS } from './rede.js';
import { textoBotao } from './anuncio.js';
import { promptEditorialAm } from './direcao-am.js';

/**
 * Anúncio da marca Postei via Imagine (xAI).
 *
 * Sem XAI_API_KEY o caller cai no template satori. Texto do cliente
 * continua no LiteLLM — esta rota não mistura com a conta Gemini.
 */

const CENAS = [
  'iPhone contemporâneo em fundo creme de estúdio, tela mostrando um feed do Instagram com grade mista de posts de comida e cards tipográficos escuros, sem números, sombra suave',
  'vários cards de post do Instagram flutuando em 3D saindo de um smartphone inclinado, brilho verde sutil, fundo creme, fotografia de produto de app',
  'mesa de trabalho à noite: notebook com o Canva aberto e uma página em branco, ao lado um celular com o mês de posts já pronto e checks verdes',
  'dashboard do app Postei num iPhone: lista “Próximos posts” com thumbnails e checks verdes, fundo creme, estilo de anúncio de SaaS, sem valores em reais',
  'antes e depois: à esquerda um feed vazio e uma tela em branco; à direita um feed cheio e profissional no mesmo celular',
  'calendário de 30 dias visto de cima, cada dia com um thumbnail de post, um iPhone ao lado, fundo creme, luz de estúdio',
  'pessoa de costas olhando um celular com a tela em branco numa mesa, composição limpa, espaço negativo em cima para a headline',
];

function cenasPara(post) {
  if (post.visual && String(post.visual).trim()) return String(post.visual).trim();
  const i = Math.abs(hash(post.titulo || '')) % CENAS.length;
  return CENAS[i];
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

export function promptDoAnuncio(post, tela) {
  const headline = String(post.titulo || '').trim();
  const apoio = String(post.subtitulo || '').trim();
  const botao = textoBotao(post);
  const cena = cenasPara(post);
  const retrato = !tela || tela.id !== 'linkedin';

  return `Create a finished Instagram advertisement poster for the Brazilian SaaS app "Postei".

BRAND (follow exactly):
- Wordmark "Postei" next to a rounded green square (#16C45A) with a white capital P. No ®, no extra trademark.
- Background: warm cream #F4F1EA, not pure white, not dark
- Headline color: near-black #111111
- Accent and CTA button: #16C45A with white text
- Clean, premium, Apple-like product ad. No clutter, no stock-photo watermark, no extra brand logos

FORMAT:
- ${retrato ? 'Portrait poster' : 'Square poster'}
- Large headline at the top, product visual in the middle, one green pill CTA button near the bottom
- Small grey line under the button: "Sem cartão de crédito. Cancele quando quiser."

TEXT ON THE IMAGE — write EXACTLY this Portuguese, with accents, no extra words, no misspellings:
- Headline: ${headline}
${apoio ? `- Subtitle under the headline: ${apoio}` : ''}
- Button: ${botao}

SCENE:
${cena}

HARD RULES:
- Do not invent testimonials, percentages, money amounts, follower counts or @handles.
- Phone screens may show food photos and short typographic cards, but NO prices and NO fake usernames.
- Do not write English on the poster.
- Output only the image.`;
}

function bytesDeDataUri(uri) {
  const m = String(uri).match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!m) return null;
  return Buffer.from(m[1], 'base64');
}

async function baixarUrl(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) throw new Error(`download da imagem xAI HTTP ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

function extrairDaResposta(dados) {
  const item = dados?.data?.[0];
  if (!item) return { tipo: 'vazio' };
  if (item.b64_json) return { tipo: 'bytes', bytes: Buffer.from(item.b64_json, 'base64') };
  if (item.url) {
    const embutido = bytesDeDataUri(item.url);
    if (embutido) return { tipo: 'bytes', bytes: embutido };
    return { tipo: 'url', url: item.url };
  }
  return { tipo: 'vazio' };
}

async function paraTela(bytes, tela, fundo = '#F4F1EA') {
  const t = tela?.largura && tela?.altura ? tela : TELAS.instagram;
  const sharp = (await import('sharp')).default;
  return sharp(bytes)
    .resize(t.largura, t.altura, {
      fit: 'contain',
      background: fundo,
    })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

export function imagineConfigurado() {
  return Boolean(config.xai.apiKey);
}

export async function gerarAnuncioIa({ post, tela = null, editorialAm = false }) {
  if (!config.xai.apiKey) {
    throw new Error('XAI_API_KEY ausente — anúncio IA precisa da chave da xAI.');
  }

  const retrato = !tela || tela.id !== 'linkedin';
  const corpo = {
    model: config.xai.modeloImagem,
    prompt: editorialAm ? promptEditorialAm(post, tela) : promptDoAnuncio(post, tela),
    n: 1,
    aspect_ratio: retrato ? '3:4' : '1:1',
    resolution: '1k',
    response_format: 'b64_json',
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.llm.timeoutImagemMs);

  let resp;
  try {
    resp = await fetch(`${config.xai.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.xai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error(`Imagine nao respondeu em ${config.llm.timeoutImagemMs}ms.`);
    }
    throw new Error(`Falha ao contatar api.x.ai: ${erro.message}`);
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();
  if (!resp.ok) {
    const erro = new Error(`xAI Imagine HTTP ${resp.status}: ${texto.slice(0, 280)}`);
    if (resp.status === 429) erro.rateLimit = true;
    throw erro;
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta Imagine nao e JSON: ${texto.slice(0, 180)}`);
  }

  const extraido = extrairDaResposta(dados);
  let bruto = extraido.tipo === 'bytes' ? extraido.bytes : null;
  if (!bruto && extraido.tipo === 'url') bruto = await baixarUrl(extraido.url);

  if (!bruto || bruto.length < 1000) {
    throw new Error('Imagine devolveu resposta sem bytes utilizaveis.');
  }

  return paraTela(bruto, tela, editorialAm ? '#080c10' : '#F4F1EA');
}
