import { NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { verAssinatura, situacaoDe } from "@/lib/mercadopago";
import { PLANOS, type Plano } from "@/lib/planos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Avisos do Mercado Pago.
 *
 * Rota aberta — quem chama é o gateway, não um usuário logado. Por isso
 * **nada do corpo é levado a sério**: pegamos apenas o id e consultamos o
 * estado real na API deles. Sem isso, qualquer um poderia POSTar aqui
 * dizendo "assinatura autorizada" e liberar um plano de graça.
 */
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);

  const id = corpo?.data?.id ?? corpo?.id;
  const tipo = corpo?.type ?? corpo?.topic;

  // O Mercado Pago manda avisos de vários assuntos no mesmo endereço.
  if (!id || !String(tipo ?? "").includes("preapproval")) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const admin = criarClienteAdmin();

  try {
    const assinatura = await verAssinatura(String(id));
    const [referencia, plano] = String(assinatura.external_reference ?? "").split(":");
    // A referência devia ser o id do usuário, mas ela vem de fora e pode ser
    // qualquer coisa (inclusive de uma assinatura criada à mão para teste).
    // Gravar lixo numa coluna uuid derruba o insert inteiro e perderíamos o
    // registro do evento -- justamente o que serve para depurar depois.
    const usuarioId = UUID.test(referencia ?? "") ? referencia : null;

    const { error: erroEvento } = await admin.from("pagamentos_eventos").insert({
      usuario_id: usuarioId,
      preapproval_id: assinatura.id,
      tipo: String(tipo),
      status: assinatura.status,
      bruto: corpo,
    });
    // O supabase-js DEVOLVE o erro, não o lança. Sem esta checagem uma falha
    // de banco viraria HTTP 200, o Mercado Pago nunca reenviaria o aviso e
    // uma assinatura paga ficaria sem ser liberada, sem deixar rastro.
    if (erroEvento) throw new Error(`gravar evento: ${erroEvento.message}`);

    if (!usuarioId || !(plano in PLANOS)) {
      return NextResponse.json({ ok: true, semVinculo: true });
    }

    const situacao = situacaoDe(assinatura.status);

    const { error: erroAssinatura } = await admin
      .from("assinaturas")
      .update({
        // O plano só passa a valer quando o pagamento está autorizado. Antes
        // disso a pessoa continua no que já tinha — nada de liberar cota
        // enquanto a cobrança está apenas "pendente".
        ...(situacao === "ativa" ? { plano: plano as Plano } : {}),
        ativa: situacao === "ativa",
        status_pagamento: situacao,
        mp_preapproval_id: assinatura.id,
        proximo_pagamento: assinatura.next_payment_date ?? null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("usuario_id", usuarioId);

    if (erroAssinatura) throw new Error(`atualizar assinatura: ${erroAssinatura.message}`);

    return NextResponse.json({ ok: true, situacao });
  } catch (erro) {
    console.error("[postei][webhook]", (erro as Error).message);
    // Devolver erro faz o Mercado Pago reenviar depois, que é o desejado
    // quando a falha é nossa (banco fora, timeout).
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}

/** O Mercado Pago valida o endereço com um GET antes de usar. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
