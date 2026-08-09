import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { publicarAgora, contaConectada } from "@/lib/publicacao";

/** Publica um post do lote na hora. A lógica em si vive em lib/publicacao. */
export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const loteId = typeof corpo?.loteId === "string" ? corpo.loteId : "";
  const indice = Number(corpo?.indice);

  if (!loteId || !Number.isInteger(indice) || indice < 0) {
    return NextResponse.json({ erro: "Informe o lote e qual post publicar." }, { status: 400 });
  }

  const conta = await contaConectada(user.id);
  if (!conta) return NextResponse.json({ erro: "Conecte seu Instagram antes." }, { status: 400 });

  const admin = criarClienteAdmin();
  const { data: registro } = await admin
    .from("publicacoes")
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
    const { mediaId } = await publicarAgora({
      usuarioId: user.id,
      loteId,
      indice,
      registroId: registro!.id,
      base,
    });
    return NextResponse.json({ ok: true, mediaId });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 502 });
  }
}
