import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarAssinatura } from "@/lib/mercadopago";
import { PLANOS, type Plano } from "@/lib/planos";

/** Cria a assinatura no gateway e devolve o link do checkout. */
export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const plano = corpo?.plano as Plano;

  if (!plano || !(plano in PLANOS) || plano === "teste") {
    return NextResponse.json({ erro: "Escolha um plano válido." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const assinatura = await criarAssinatura({
      plano: plano as Exclude<Plano, "teste">,
      email: user.email!,
      usuarioId: user.id,
      retorno: `${base}/painel?pagamento=voltou`,
    });

    // Guarda o vínculo ANTES de mandar a pessoa para o checkout: se ela
    // pagar e o webhook chegar antes de gravarmos, não saberíamos de quem é.
    const admin = criarClienteAdmin();
    await admin
      .from("assinaturas")
      .update({
        mp_preapproval_id: assinatura.id,
        status_pagamento: "pendente",
        atualizado_em: new Date().toISOString(),
      })
      .eq("usuario_id", user.id);

    return NextResponse.json({ checkout: assinatura.init_point });
  } catch (erro) {
    console.error("[postei][pagamento]", (erro as Error).message);
    return NextResponse.json(
      { erro: "Não consegui abrir o pagamento agora. Tente de novo." },
      { status: 502 },
    );
  }
}
