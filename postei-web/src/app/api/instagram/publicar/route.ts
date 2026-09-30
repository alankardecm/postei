import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { publicarAgora, contaConectada, registroAtivoInstagram } from "@/lib/publicacao";

/** Publica um post do lote na hora. A lógica em si vive em lib/publicacao. */
export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const loteId = typeof corpo?.loteId === "string" ? corpo.loteId : "";
  const indice = Number(corpo?.indice);
  const modo = corpo?.modo === "reels" ? "reels" : "feed";

  if (!loteId || !Number.isInteger(indice) || indice < 0) {
    return NextResponse.json({ erro: "Informe o lote e qual post publicar." }, { status: 400 });
  }

  const conta = await contaConectada(user.id);
  if (!conta) return NextResponse.json({ erro: "Conecte seu Instagram antes." }, { status: 400 });

  const ja = await registroAtivoInstagram(user.id, loteId, indice);
  if (ja?.situacao === "publicada") {
    return NextResponse.json({ ok: true, mediaId: ja.ig_media_id, ja: true, modo });
  }
  if (ja?.situacao === "agendada") {
    return NextResponse.json({ erro: "Esse post já está agendado." }, { status: 409 });
  }
  if (ja?.situacao === "publicando") {
    return NextResponse.json({ erro: "Esse post já está saindo." }, { status: 409 });
  }

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
      modo,
    });
    return NextResponse.json({ ok: true, mediaId, modo });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 502 });
  }
}
