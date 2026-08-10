import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { contaConectada } from "@/lib/publicacao";
import { assinaturaDe } from "@/lib/cota";
import { PLANOS } from "@/lib/planos";

/** Agenda um post. Quem publica depois é a rotina em /api/cron/publicar. */
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
  // Cinco minutos de folga: a rotina roda de 5 em 5, e agendar para daqui a
  // 30 segundos criaria a expectativa de algo que não vai acontecer na hora.
  if (quando.getTime() < Date.now() + 5 * 60 * 1000) {
    return NextResponse.json(
      { erro: "Escolha um horário pelo menos 5 minutos à frente." },
      { status: 400 },
    );
  }

  const conta = await contaConectada(user.id);
  if (!conta) return NextResponse.json({ erro: "Conecte seu Instagram antes." }, { status: 400 });

  const admin = criarClienteAdmin();

  // No plano de teste o agendamento é uma amostra: um, para sentir o ciclo.
  const assinatura = await assinaturaDe(user.id);
  const teto = PLANOS[assinatura.plano].agendamentos;
  if (teto !== null) {
    const { count } = await admin
      .from("publicacoes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id);

    if ((count ?? 0) >= teto) {
      return NextResponse.json(
        {
          erro:
            "O teste inclui um agendamento. Assine um plano para agendar o mês inteiro.",
        },
        { status: 402 },
      );
    }
  }

  const { error } = await admin.from("publicacoes").insert({
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
    // O índice único impede agendar o mesmo post duas vezes.
    const duplicado = error.code === "23505";
    return NextResponse.json(
      { erro: duplicado ? "Esse post já está agendado." : "Não consegui agendar." },
      { status: duplicado ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, quando: quando.toISOString() }, { status: 201 });
}

/** Cancela um agendamento. */
export async function DELETE(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "Informe o agendamento." }, { status: 400 });

  const admin = criarClienteAdmin();
  // Só apaga o que ainda não saiu, e só do próprio dono.
  const { error } = await admin
    .from("publicacoes")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id)
    .eq("situacao", "agendada");

  if (error) return NextResponse.json({ erro: "Não consegui cancelar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
