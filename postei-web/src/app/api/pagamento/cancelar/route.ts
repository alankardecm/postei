import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { cancelarAssinatura } from "@/lib/mercadopago";

/** Cancela a assinatura. O acesso continua até o fim do ciclo pago. */
export async function POST() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("assinaturas")
    .select("mp_preapproval_id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!data?.mp_preapproval_id) {
    return NextResponse.json({ erro: "Você não tem assinatura ativa." }, { status: 400 });
  }

  try {
    await cancelarAssinatura(data.mp_preapproval_id);
    // O estado final vem pelo webhook; aqui só registramos a intenção para
    // a tela responder na hora.
    await admin
      .from("assinaturas")
      .update({ status_pagamento: "cancelada", atualizado_em: new Date().toISOString() })
      .eq("usuario_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[postei][cancelar]", (erro as Error).message);
    return NextResponse.json({ erro: "Não consegui cancelar. Fale com a gente." }, { status: 502 });
  }
}
