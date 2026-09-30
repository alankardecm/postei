import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";

/** Aceita ou descarta a prévia do Reel. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ loteId: string; indice: string }> },
) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { loteId, indice } = await params;
  const corpo = await request.json().catch(() => ({}));
  const acao = corpo?.acao === "aceitar" || corpo?.acao === "recusar" ? corpo.acao : null;
  if (!acao) {
    return NextResponse.json({ erro: "Diga se aceita ou recusa a prévia." }, { status: 400 });
  }

  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";
  const chave = process.env.POSTEI_API_KEY || "";

  try {
    const resposta = await fetch(
      `${base}/lotes/${encodeURIComponent(loteId)}/posts/${encodeURIComponent(indice)}/reel/decisao`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-postei-chave": chave,
          "x-postei-assinante": user.id,
        },
        body: JSON.stringify({ acao }),
        signal: AbortSignal.timeout(30000),
      },
    );

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return NextResponse.json(
        { erro: (dados as { erro?: string }).erro || "Não consegui guardar a decisão." },
        { status: resposta.status },
      );
    }
    return NextResponse.json(dados);
  } catch {
    return NextResponse.json(
      { erro: "O motor de geração não respondeu. Ele está no ar?" },
      { status: 503 },
    );
  }
}
