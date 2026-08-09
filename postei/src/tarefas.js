import { randomUUID } from 'node:crypto';
import { gerarPacote } from './gerador.js';
import {
  criarGeracao,
  atualizarGeracao,
  verGeracao,
  temGeracaoEmAndamento,
  geracoesOrfas,
} from './banco.js';

/**
 * Fila de geração, persistida no banco.
 *
 * Antes era um Map em memória. Um pacote de 30 posts leva ~3 minutos, e um
 * `pm2 restart` no meio disso apagava a tarefa: o assinante ficava olhando
 * "gerando..." para sempre, tendo pago por aquilo. Agora o estado vive no
 * banco e o motor recupera o que ficou pelo caminho ao subir.
 */

/** Quantas vezes uma tarefa pode ser retomada após queda do processo.
 *  Sem teto, uma que sempre quebra ficaria em laço consumindo cota. */
const TENTATIVAS_MAX = 3;

export async function criarTarefa({ nichoId, marca, quantidade, assinanteId, ciclo }) {
  if (await temGeracaoEmAndamento(assinanteId)) {
    const erro = new Error('Você já tem um pacote sendo gerado. Aguarde ele terminar.');
    erro.codigo = 'ja_em_andamento';
    throw erro;
  }

  const id = randomUUID();
  await criarGeracao({ id, usuarioId: assinanteId, nicho: nichoId, marca, quantidade, ciclo });

  processar({ id, nichoId, marca, quantidade, assinanteId });

  return { id, situacao: 'gerando' };
}

/** Roda solta: quem chamou já recebeu o id e vai perguntar o andamento. */
function processar({ id, nichoId, marca, quantidade, assinanteId }) {
  gerarPacote({ nichoId, marca, quantidade, assinanteId })
    .then((pacote) =>
      atualizarGeracao(id, {
        situacao: 'pronta',
        resultado: {
          loteId: pacote.loteId,
          posts: pacote.posts.length,
          solicitados: pacote.solicitados,
          parcial: pacote.parcial,
          nicho: pacote.nicho,
          marca: pacote.marca,
          duracaoMs: pacote.duracaoMs,
        },
      }),
    )
    .catch(async (erro) => {
      console.error(`[postei] geração ${id} falhou: ${erro.message}`);
      await atualizarGeracao(id, { situacao: 'falhou', erro: erro.message }).catch(() => {});
    });
}

export async function verTarefa(id, assinanteId) {
  const linha = await verGeracao(id, assinanteId);
  if (!linha) return null;

  return {
    id: linha.id,
    // O painel conhece 'gerando' | 'pronta' | 'falhou'.
    situacao: linha.situacao === 'na_fila' ? 'gerando' : linha.situacao,
    resultado: linha.resultado,
    erro: linha.erro,
    criadaEm: linha.criado_em,
  };
}

/**
 * Retoma o que ficou preso em 'gerando' quando o processo caiu.
 *
 * Chamado uma vez, na subida. Refaz a geração inteira em vez de tentar
 * continuar de onde parou: o pacote é gerado em blocos e não há ponto de
 * retomada confiável — repetir é mais simples e o custo é baixo.
 */
export async function retomarPendentes() {
  let orfas;
  try {
    orfas = await geracoesOrfas(TENTATIVAS_MAX);
  } catch (erro) {
    console.warn(`[postei] não consegui checar a fila: ${erro.message}`);
    return 0;
  }

  if (!orfas?.length) return 0;

  for (const g of orfas) {
    console.log(`[postei] retomando geração ${g.id} (tentativa ${g.tentativas + 1})`);
    await atualizarGeracao(g.id, { tentativas: g.tentativas + 1 }).catch(() => {});
    processar({
      id: g.id,
      nichoId: g.nicho,
      marca: g.marca,
      quantidade: g.quantidade,
      assinanteId: g.usuario_id,
    });
  }

  return orfas.length;
}

/** Marca como falha o que já passou do teto de tentativas. */
export async function encerrarInsistentes() {
  try {
    const presas = await geracoesOrfas(999);
    for (const g of presas.filter((x) => x.tentativas >= TENTATIVAS_MAX)) {
      await atualizarGeracao(g.id, {
        situacao: 'falhou',
        erro: 'A geração não completou após várias tentativas. Tente gerar de novo.',
      });
    }
  } catch {
    // Limpeza é oportunista; falhar aqui não pode impedir o motor de subir.
  }
}
