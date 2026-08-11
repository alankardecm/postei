import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";

/**
 * Anexa um MP4 ao post para publicar como Reel.
 * Não gera vídeo — só armazena. Ver docs/MIDIA-FOTO-VIDEO.md.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ loteId: string; indice: string }> },
) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { loteId, indice } = await params;
  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";
  const chave = process.env.POSTEI_API_KEY || "";

  let videoBase64: string;

  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      return NextResponse.json({ erro: "Envie um arquivo MP4." }, { status: 400 });
    }
    if (arquivo.size > 80 * 1024 * 1024) {
      return NextResponse.json({ erro: "O vídeo pode ter no máximo 80 MB." }, { status: 400 });
    }
    const mime = arquivo.type || "";
    if (mime && !/^video\/(mp4|quicktime)$/i.test(mime) && !arquivo.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json({ erro: "Use um arquivo MP4." }, { status: 400 });
    }
    const buf = Buffer.from(await arquivo.arrayBuffer());
    videoBase64 = buf.toString("base64");
  } catch {
    return NextResponse.json({ erro: "Não consegui ler o vídeo." }, { status: 400 });
  }

  try {
    const resposta = await fetch(
      `${base}/lotes/${encodeURIComponent(loteId)}/posts/${encodeURIComponent(indice)}/video`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-postei-chave": chave,
          "x-postei-assinante": user.id,
        },
        body: JSON.stringify({ videoBase64 }),
        signal: AbortSignal.timeout(120000),
      },
    );

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return NextResponse.json(
        { erro: (dados as { erro?: string }).erro || "Não consegui guardar o vídeo." },
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
