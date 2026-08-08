import { config } from './config.js';

/**
 * Cliente do LiteLLM.
 *
 * Regra do projeto: toda chamada carrega o `user` (id do assinante). E isso
 * que faz o LiteLLM contabilizar e cortar o gasto por assinante -- sem o
 * campo, o teto de plano vira honra em vez de codigo.
 */
/**
 * Tenta a cascata de modelos em ordem, caindo para o proximo sempre que o
 * atual devolve 429. No free tier do Gemini cada modelo tem cota propria,
 * entao a cascata e a diferenca entre "o lote do assinante falhou" e "o lote
 * saiu num modelo alternativo".
 */
export async function chamarLLM({ prompt, sistema, assinanteId, modelo, json = false }) {
  const candidatos = modelo ? [modelo] : config.llm.cascata;
  let ultimoErro;

  for (const candidato of candidatos) {
    try {
      return await chamarModelo({ prompt, sistema, assinanteId, modelo: candidato, json });
    } catch (erro) {
      ultimoErro = erro;
      if (!erro.rateLimit) throw erro;
      console.warn(`[postei] ${candidato} sem cota, tentando o proximo da cascata...`);
    }
  }
  throw ultimoErro;
}

async function chamarModelo({ prompt, sistema, assinanteId, modelo, json }) {
  const corpo = {
    model: modelo,
    messages: [
      ...(sistema ? [{ role: 'system', content: sistema }] : []),
      { role: 'user', content: prompt },
    ],
    user: assinanteId,
    temperature: 0.9, // conteudo repetido e o que mata a percepcao de valor
    max_tokens: 8192, // sem teto explicito o JSON trunca no meio em lote grande
  };
  if (json) corpo.response_format = { type: 'json_object' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.llm.timeoutMs);

  let resp;
  try {
    resp = await fetch(`${config.llm.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llm.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error(`LLM nao respondeu em ${config.llm.timeoutMs}ms (modelo ${corpo.model}).`);
    }
    throw new Error(`Falha ao contatar o LiteLLM em ${config.llm.baseUrl}: ${erro.message}`);
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();
  if (!resp.ok) {
    // Rate limit do free tier do Gemini e o erro mais provavel aqui;
    // vale distinguir para o chamador poder reduzir o lote e tentar de novo.
    if (resp.status === 429) {
      // O Gemini informa no corpo quanto esperar ("Please retry in 55.4s").
      // Obedecer esse numero e melhor do que chutar um backoff proprio.
      const m = texto.match(/retry in ([\d.]+)s/i);
      const erro = new Error(`LiteLLM devolveu HTTP 429 (cota do provedor estourada)`);
      erro.rateLimit = true;
      erro.esperarMs = m ? Math.ceil(Number(m[1]) * 1000) : null;
      throw erro;
    }
    throw new Error(`LiteLLM devolveu HTTP ${resp.status}: ${texto.slice(0, 300)}`);
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta do LiteLLM nao e JSON: ${texto.slice(0, 200)}`);
  }

  const conteudo = dados?.choices?.[0]?.message?.content;
  if (!conteudo) throw new Error(`LiteLLM devolveu resposta sem conteudo: ${texto.slice(0, 200)}`);

  return { conteudo, uso: dados.usage || null };
}

/**
 * Extrai JSON de resposta de modelo. Mesmo com response_format, modelo as
 * vezes embrulha em cerca de markdown -- tratar isso aqui evita espalhar
 * try/catch pelo resto do codigo.
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
