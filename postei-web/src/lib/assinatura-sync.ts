import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarAssinaturas, situacaoDe, type Preapproval } from "@/lib/mercadopago";
import { PLANOS, type Plano } from "@/lib/planos";

/**
 * Põe o banco em dia com o Mercado Pago.
 *
 * O webhook é rápido mas não é garantido: aviso se perde, o gateway fica
 * fora do ar, o nosso servidor está reiniciando. Se o plano dependesse só
 * dele, um cliente pagaria e não receberia nada -- e ninguém ficaria
 * sabendo, porque não haveria erro em lugar nenhum.
 *
 * Aqui a verdade é buscada na fonte. Roda quando a pessoa volta do checkout
 * e uma vez por dia para todo mundo, o que também pega renovação, falha de
 * cobrança e cancelamento feito do lado deles.
 */

/**
 * Entre várias assinaturas do mesmo usuário, qual vale.
 *
 * Autorizada sempre ganha de pendente -- quem tentou pagar duas vezes e
 * conseguiu na segunda não pode ficar preso ao primeiro registro. Havendo
 * empate, a mais recente.
 */
function aQueVale(assinaturas: Preapproval[]) {
  const peso = { authorized: 3, pending: 2, paused: 1, cancelled: 0 } as const;
  return [...assinaturas].sort(
    (a, b) =>
      (peso[b.status] ?? 0) - (peso[a.status] ?? 0) ||
      String(b.date_created ?? "").localeCompare(String(a.date_created ?? "")),
  )[0];
}

export async function sincronizarAssinatura(usuarioId: string) {
  const encontradas = await buscarAssinaturas(usuarioId);
  if (encontradas.length === 0) return { mudou: false, motivo: "sem assinatura no gateway" };

  const atual = aQueVale(encontradas);
  const plano = String(atual.external_reference ?? "").split(":")[1];
  if (!(plano in PLANOS)) return { mudou: false, motivo: `plano desconhecido: ${plano}` };

  const situacao = situacaoDe(atual.status);
  const admin = criarClienteAdmin();

  const { error } = await admin
    .from("assinaturas")
    .update({
      // Só o pagamento autorizado libera o plano. Enquanto está pendente a
      // pessoa continua no que já tinha -- nada de conceder cota adiantado.
      ...(situacao === "ativa" ? { plano: plano as Plano } : {}),
      ativa: situacao === "ativa",
      status_pagamento: situacao,
      mp_preapproval_id: atual.id,
      proximo_pagamento: atual.next_payment_date ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("usuario_id", usuarioId);

  if (error) throw new Error(`sincronizar assinatura: ${error.message}`);

  return { mudou: true, situacao, plano, preapproval: atual.id };
}

/** Reconcilia todo mundo. Usado pela rotina diária. */
export async function sincronizarTodas() {
  const admin = criarClienteAdmin();
  const { data, error } = await admin.from("assinaturas").select("usuario_id");
  if (error) throw new Error(`listar assinaturas: ${error.message}`);

  const resultados: { usuarioId: string; ok: boolean; detalhe: string }[] = [];

  for (const { usuario_id } of data ?? []) {
    try {
      const r = await sincronizarAssinatura(usuario_id);
      resultados.push({
        usuarioId: usuario_id,
        ok: true,
        detalhe: r.mudou ? `${r.situacao} · ${r.plano}` : r.motivo!,
      });
    } catch (erro) {
      // Um usuário com problema não pode interromper a fila dos outros.
      resultados.push({ usuarioId: usuario_id, ok: false, detalhe: (erro as Error).message });
    }
  }

  return resultados;
}
