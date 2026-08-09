import { config } from './config.js';

/**
 * Acesso do motor ao banco, pela API REST do Supabase.
 *
 * Por `fetch` e nao por driver: o motor precisa de meia duzia de operacoes
 * simples, e uma dependencia nova traria pool de conexao, migracao e mais
 * uma coisa para manter. Se um dia precisar de transacao ou consulta
 * pesada, ai sim vale o driver.
 */

function exigirConfig() {
  if (!config.banco.url || !config.banco.chave) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY nao configurados no motor.');
  }
}

async function chamar(caminho, opcoes = {}) {
  exigirConfig();

  const resposta = await fetch(`${config.banco.url}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      apikey: config.banco.chave,
      Authorization: `Bearer ${config.banco.chave}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(`banco devolveu ${resposta.status}: ${texto.slice(0, 200)}`);
  }
  return texto ? JSON.parse(texto) : null;
}

export async function criarGeracao({ id, usuarioId, nicho, marca, quantidade, ciclo }) {
  const [linha] = await chamar('geracoes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id,
      usuario_id: usuarioId,
      nicho,
      marca,
      quantidade,
      ciclo: ciclo ?? null,
      situacao: 'gerando',
      tentativas: 1,
    }),
  });
  return linha;
}

export async function atualizarGeracao(id, campos) {
  return chamar(`geracoes?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...campos, atualizado_em: new Date().toISOString() }),
  });
}

export async function verGeracao(id, usuarioId) {
  const linhas = await chamar(
    `geracoes?id=eq.${id}&usuario_id=eq.${usuarioId}` +
      '&select=id,situacao,resultado,erro,criado_em,quantidade',
  );
  return linhas?.[0] ?? null;
}

export async function temGeracaoEmAndamento(usuarioId) {
  const linhas = await chamar(
    `geracoes?usuario_id=eq.${usuarioId}&situacao=in.(na_fila,gerando)&select=id&limit=1`,
  );
  return (linhas?.length ?? 0) > 0;
}

/**
 * Tarefas que ficaram presas em 'gerando' quando o processo caiu.
 *
 * Sem isto, um reinicio do pm2 no meio de uma geracao deixa o assinante
 * olhando "gerando..." para sempre -- e ele pagou por aquilo.
 */
export async function geracoesOrfas(tentativasMax) {
  return chamar(
    `geracoes?situacao=eq.gerando&tentativas=lt.${tentativasMax}` +
      '&select=id,usuario_id,nicho,marca,quantidade,ciclo,tentativas&order=criado_em.asc&limit=10',
  );
}
