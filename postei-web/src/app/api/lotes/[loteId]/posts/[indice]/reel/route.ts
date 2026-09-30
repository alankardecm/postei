import { NextResponse } from "next/server";
import { motor, usuarioAtual } from "@/lib/motor";
import { ehAcessoMarcaPropria, ehNichoMarcaInterna } from "@/lib/planos";

export const maxDuration = 540;

/**
 * Gera a prévia do Reel. Cliente = Ken Burns; marca = Imagine.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ loteId: string; indice: string }> },
) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { loteId, indice } = await params;
  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";
  const chave = process.env.POSTEI_API_KEY || "";

  try {
    const lote = (await motor.lote(user.id, loteId)) as { nicho?: { id?: string } };
    if (ehNichoMarcaInterna(lote.nicho?.id) && !ehAcessoMarcaPropria(user.email)) {
      return NextResponse.json({ erro: "Este Reel é só da marca da casa." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ erro: "Lote não encontrado." }, { status: 404 });
  }

  try {
    const resposta = await fetch(
      `${base}/lotes/${encodeURIComponent(loteId)}/posts/${encodeURIComponent(indice)}/reel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-postei-chave": chave,
          "x-postei-assinante": user.id,
        },
        body: "{}",
        signal: AbortSignal.timeout(9 * 60 * 1000),
      },
    );

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return NextResponse.json(
        { erro: (dados as { erro?: string }).erro || "Não consegui gerar o Reel." },
        { status: resposta.status },
      );
    }
    return NextResponse.json(dados);
  } catch {
    return NextResponse.json(
      { erro: "O motor não respondeu a tempo. Tente de novo." },
      { status: 503 },
    );
  }
}
