import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { contaLinkedin, publicarLinkedinAgora } from "@/lib/publicacao-linkedin";

export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const loteId = typeof corpo?.loteId === "string" ? corpo.loteId : "";
  const indice = Number(corpo?.indice);

  if (!loteId || !Number.isInteger(indice) || indice < 0) {
    return NextResponse.json({ erro: "Informe o lote e qual post publicar." }, { status: 400 });
  }

  const conta = await contaLinkedin(user.id);
  if (!conta) return NextResponse.json({ erro: "Conecte seu LinkedIn antes." }, { status: 400 });

  const admin = criarClienteAdmin();
  const { data: registro } = await admin
    .from("publicacoes_linkedin")
    .insert({
      usuario_id: user.id,
      conta_id: conta.id,
      lote_id: loteId,
      indice,
      arquivo: "",
      legenda: "",
      agendada_para: new Date().toISOString(),
      situacao: "publicando",
    })
    .select("id")
    .single();

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const { postUrn } = await publicarLinkedinAgora({
      usuarioId: user.id,
      loteId,
      indice,
      registroId: registro!.id,
      base,
    });
    return NextResponse.json({ ok: true, postUrn });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 502 });
  }
}
