import { randomUUID } from 'node:crypto';
import { gerarPacote } from './gerador.js';

/**
 * Fila de geracao em segundo plano.
 *
 * Um pacote de 30 posts leva ~3 minutos. Isso nao cabe numa requisicao HTTP:
 * o proxy corta antes, o navegador desiste, e o usuario fica olhando uma tela
 * travada sem saber se funcionou. Entao a rota devolve um id na hora e o
 * painel pergunta o andamento.
 *
 * A fila e em memoria de proposito -- e o suficiente para o piloto. Se o
 * processo reiniciar no meio, a tarefa se perde (o disco guarda o que ja
 * saiu). Quando houver assinante pagante, isso vai para uma tabela.
 */

const tarefas = new Map();

/** Tarefas terminadas somem da memoria depois disso. */
const VALIDADE_MS = 60 * 60 * 1000;

/** Uma geracao por assinante ao mesmo tempo: duas em paralelo so competem
 *  pela mesma cota do provedor e as duas saem piores. */
const emAndamento = new Set();

export function criarTarefa({ nichoId, marca, quantidade, assinanteId }) {
  if (emAndamento.has(assinanteId)) {
    const erro = new Error('Você já tem um pacote sendo gerado. Aguarde ele terminar.');
    erro.codigo = 'ja_em_andamento';
    throw erro;
  }

  const id = randomUUID();
  const tarefa = {
    id,
    assinanteId,
    situacao: 'gerando',
    criadaEm: new Date().toISOString(),
    pedido: { nichoId, marca, quantidade },
    resultado: null,
    erro: null,
  };
  tarefas.set(id, tarefa);
  emAndamento.add(assinanteId);

  // Roda solta de proposito: quem chamou ja recebeu o id.
  gerarPacote({ nichoId, marca, quantidade, assinanteId })
    .then((pacote) => {
      tarefa.situacao = 'pronta';
      tarefa.resultado = {
        loteId: pacote.loteId,
        posts: pacote.posts.length,
        solicitados: pacote.solicitados,
        parcial: pacote.parcial,
        nicho: pacote.nicho,
        marca: pacote.marca,
        duracaoMs: pacote.duracaoMs,
      };
    })
    .catch((erro) => {
      tarefa.situacao = 'falhou';
      tarefa.erro = erro.message;
      console.error(`[postei] tarefa ${id} falhou: ${erro.message}`);
    })
    .finally(() => {
      tarefa.terminadaEm = new Date().toISOString();
      emAndamento.delete(assinanteId);
      setTimeout(() => tarefas.delete(id), VALIDADE_MS).unref();
    });

  return tarefa;
}

/** O assinanteId e exigido: sem ele, qualquer um leria a tarefa de outro. */
export function verTarefa(id, assinanteId) {
  const tarefa = tarefas.get(id);
  if (!tarefa || tarefa.assinanteId !== assinanteId) return null;
  return tarefa;
}
