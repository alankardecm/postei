import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { contaLinkedin } from "@/lib/publicacao-linkedin";
import { assinaturaDe } from "@/lib/cota";
import { PLANOS } from "@/lib/planos";

export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const loteId = typeof corpo?.loteId === "string" ? corpo.loteId : "";
  const indice = Number(corpo?.indice);
  const quando = new Date(String(corpo?.quando ?? ""));

  if (!loteId || !Number.isInteger(indice) || indice < 0) {
    return NextResponse.json({ erro: "Informe o lote e qual post agendar." }, { status: 400 });
  }
  if (Number.isNaN(quando.getTime())) {
    return NextResponse.json({ erro: "Data inválida." }, { status: 400 });
  }
  if (quando.getTime() < Date.now() + 5 * 60 * 1000) {
    return NextResponse.json(
      { erro: "Escolha um horário pelo menos 5 minutos à frente." },
      { status: 400 },
    );
  }

  const conta = await contaLinkedin(user.id);
  if (!conta) return NextResponse.json({ erro: "Conecte seu LinkedIn antes." }, { status: 400 });

  const admin = criarClienteAdmin();
  const assinatura = await assinaturaDe(user.id);
  const teto = PLANOS[assinatura.plano].agendamentos;
  if (teto !== null) {
    const { count: ig } = await admin
      .from("publicacoes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id);
    const { count: li } = await admin
      .from("publicacoes_linkedin")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id);
    if ((ig ?? 0) + (li ?? 0) >= teto) {
      return NextResponse.json(
        { erro: "O teste inclui um agendamento. Assine um plano para agendar o mês inteiro." },
        { status: 402 },
      );
    }
  }

  const { error } = await admin.from("publicacoes_linkedin").insert({
    usuario_id: user.id,
    conta_id: conta.id,
    lote_id: loteId,
    indice,
    arquivo: "",
    legenda: "",
    agendada_para: quando.toISOString(),
    situacao: "agendada",
  });

  if (error) {
    const duplicado = error.code === "23505";
    return NextResponse.json(
      { erro: duplicado ? "Esse post já está agendado no LinkedIn." : "Não consegui agendar." },
      { status: duplicado ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, quando: quando.toISOString() }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "Informe o agendamento." }, { status: 400 });

  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("publicacoes_linkedin")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id)
    .eq("situacao", "agendada");

  if (error) return NextResponse.json({ erro: "Não consegui cancelar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
