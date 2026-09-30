import { config } from './config.js';

/**
 * Cliente do LiteLLM & OpenRouter para o Postei.
 *
 * Se o assinante for o Alan (ALAN_USER_ID) ou houver OPENROUTER_API_KEY configurada,
 * ele utiliza Claude Sonnet 5 (ou modelo definido em ALAN_MODELO) como prioridade 1.
 */
export async function chamarLLM({ prompt, sistema, assinanteId, modelo, json = false }) {
  const ALAN_ID = process.env.ALAN_USER_ID || 'a52f37c6-788f-46bd-96c2-df7908b8b7b4';
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const modeloAlan = process.env.ALAN_MODELO || 'anthropic/claude-sonnet-5';

  let candidatos = modelo ? [modelo] : config.llm.cascata;
  if (assinanteId === ALAN_ID && !modelo && openRouterKey) {
    candidatos = [modeloAlan, ...candidatos];
  }

  let ultimoErro;
  for (const candidato of candidatos) {
    try {
      return await chamarModelo({ prompt, sistema, assinanteId, modelo: candidato, json });
    } catch (erro) {
      ultimoErro = erro;
      console.warn(`[postei] Falha no modelo ${candidato}: ${erro.message}. Tentando próximo da cascata...`);
    }
  }
  throw ultimoErro;
}

async function chamarModelo({ prompt, sistema, assinanteId, modelo, json }) {
  const isOpenRouter = modelo.includes('/') && (
    modelo.startsWith('anthropic/') ||
    modelo.startsWith('openrouter/') ||
    modelo.startsWith('minimax/') ||
    modelo.startsWith('deepseek/') ||
    modelo.startsWith('google/') ||
    modelo.startsWith('openai/')
  );
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const url = (isOpenRouter && openRouterKey)
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : `${config.llm.baseUrl}/v1/chat/completions`;

  const headers = (isOpenRouter && openRouterKey) ? {
    Authorization: `Bearer ${openRouterKey}`,
    'HTTP-Referer': 'https://postei.amconsultoria.tech',
    'X-Title': 'Postei Social Media',
    'Content-Type': 'application/json'
  } : {
    Authorization: `Bearer ${config.llm.apiKey}`,
    'Content-Type': 'application/json',
  };

  const corpo = {
    model: modelo.replace(/^openrouter\//, ''),
    messages: [
      ...(sistema ? [{ role: 'system', content: sistema }] : []),
      { role: 'user', content: prompt },
    ],
    temperature: 0.85,
    max_tokens: 8192,
  };
  if (json) corpo.response_format = { type: 'json_object' };
  if (!isOpenRouter && assinanteId) corpo.user = assinanteId;

  const timeoutMs = config.llm.timeoutMs || 90000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error(`LLM nao respondeu em ${timeoutMs}ms (modelo ${corpo.model}).`);
    }
    throw new Error(`Falha ao contatar gateway em ${url}: ${erro.message}`);
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();
  if (!resp.ok) {
    if (resp.status === 429) {
      const m = texto.match(/retry in ([\d.]+)s/i);
      const erro = new Error(`Provedor devolveu HTTP 429 (cota do modelo ${corpo.model} estourada)`);
      erro.rateLimit = true;
      erro.esperarMs = m ? Math.ceil(Number(m[1]) * 1000) : null;
      throw erro;
    }
    throw new Error(`Gateway devolveu HTTP ${resp.status}: ${texto.slice(0, 300)}`);
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta do gateway nao e JSON: ${texto.slice(0, 200)}`);
  }

  const conteudo = dados?.choices?.[0]?.message?.content;
  if (!conteudo) throw new Error(`Gateway devolveu resposta sem conteudo: ${texto.slice(0, 200)}`);

  return { conteudo, uso: dados.usage || null };
}

/**
 * Extrai JSON de resposta de modelo.
 */
export function extrairJSON(texto) {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(limpo);
  } catch {
    const inicio = limpo.search(/[[{]/);
    const fim = Math.max(limpo.lastIndexOf(']'), limpo.lastIndexOf('}'));
    if (inicio === -1 || fim <= inicio) {
      throw new Error(`Nao foi possivel extrair JSON da resposta: ${texto.slice(0, 200)}`);
    }
    return JSON.parse(limpo.slice(inicio, fim + 1));
  }
}
