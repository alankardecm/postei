import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function obrigatorio(chave) {
  const v = process.env[chave];
  if (!v) throw new Error(`Variavel de ambiente ausente: ${chave}. Veja o .env.example.`);
  return v;
}

export const config = {
  raiz,
  porta: Number(process.env.PORT || 4710),

  // Segredo compartilhado com o painel. O motor nao autentica pessoa --
  // quem faz isso e o painel, contra o Supabase. Aqui so confirmamos que
  // quem chama e o painel, e nao alguem que achou a porta aberta.
  chaveApi: process.env.POSTEI_API_KEY || null,

  // O motor grava a fila de geracao no banco: sem isso, um restart do pm2
  // no meio de um pacote deixaria o assinante olhando "gerando" para sempre.
  banco: {
    url: process.env.SUPABASE_URL || null,
    chave: process.env.SUPABASE_SERVICE_KEY || null,
  },

  llm: {
    // Gateway LiteLLM: e ele que aplica o teto de gasto por assinante.
    // O app NUNCA fala direto com o provedor - se falar, o budget deixa de existir.
    baseUrl: process.env.LITELLM_BASE_URL || 'http://127.0.0.1:4000',
    apiKey: obrigatorio('LITELLM_API_KEY'),
    // Padrao no lite: legenda e volume alto, e o flash comum queima
    // reasoning tokens ate numa resposta trivial.
    modeloTexto: process.env.MODELO_TEXTO || 'postei-texto-lite',
    modeloPesado: process.env.MODELO_PESADO || 'postei-texto',

    // Cascata de fallback. No free tier do Gemini CADA MODELO tem sua propria
    // cota diaria: quando o flash-lite esgota, o flash continua atendendo.
    // Sem isso, o lote do assinante morre por causa de um limite de um modelo so.
    cascata: (process.env.CASCATA_TEXTO || 'postei-texto-lite,postei-texto')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 90000),

    timeoutImagemMs: Number(process.env.LLM_TIMEOUT_IMAGEM_MS || 120000),
  },

  // Imagine da xAI — só o nicho interno da Postei. Sem chave, o anuncioIa
  // cai no template. Texto do cliente continua no LiteLLM/Gemini.
  xai: {
    apiKey: process.env.XAI_API_KEY || null,
    baseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
    modeloImagem: process.env.XAI_MODELO_IMAGEM || 'grok-imagine-image',
  },

  criativo: {
    largura: 1080,
    altura: 1350, // 4:5, o formato de feed que ocupa mais tela no Instagram
    fonteRegular: path.join(raiz, 'assets', 'fontes', 'Inter-Regular.ttf'),
    fonteBold: path.join(raiz, 'assets', 'fontes', 'Inter-Bold.ttf'),
  },

  foto: {
    // Chave gratuita em pexels.com/api. Licenca do Pexels: uso comercial
    // liberado, permite modificar, nao exige atribuicao -- por isso ele, e
    // nao acervo Creative Commons (que tem 'by-nd' proibindo derivada).
    apiKey: process.env.PEXELS_API_KEY || null,
    // Proporcao de foto x painel de texto no criativo.
    alturaFoto: 0.56,
  },

  saida: process.env.DIR_SAIDA || path.join(raiz, 'saida'),

  // Teto de seguranca por requisicao. Impede que um bug (ou um cliente
  // curioso) peca 5000 posts e queime a cota do dia inteiro.
  maxPostsPorLote: Number(process.env.MAX_POSTS_LOTE || 30),
};
