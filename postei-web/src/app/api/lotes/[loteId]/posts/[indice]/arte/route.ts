import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";

/**
 * Troca a foto do post e re-renderiza a arte (Pexels ou upload).
 * O motor faz backup em _backup_arte_* antes de sobrescrever.
 * Documentação: docs/MIDIA-FOTO-VIDEO.md
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

  const tipo = request.headers.get("content-type") || "";
  let corpo: { fonte: string; imagemBase64?: string };

  try {
    if (tipo.includes("multipart/form-data")) {
      const form = await request.formData();
      const fonte = String(form.get("fonte") || "upload");
      if (fonte === "pexels") {
        corpo = { fonte: "pexels" };
      } else {
        const arquivo = form.get("arquivo");
        if (!(arquivo instanceof File) || arquivo.size === 0) {
          return NextResponse.json({ erro: "Envie uma imagem." }, { status: 400 });
        }
        if (arquivo.size > 8 * 1024 * 1024) {
          return NextResponse.json({ erro: "A foto pode ter no máximo 8 MB." }, { status: 400 });
        }
        const mime = arquivo.type || "";
        if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {
          return NextResponse.json(
            { erro: "Use JPEG, PNG ou WebP." },
            { status: 400 },
          );
        }
        const buf = Buffer.from(await arquivo.arrayBuffer());
        corpo = {
          fonte: "upload",
          imagemBase64: buf.toString("base64"),
        };
      }
    } else {
      const json = await request.json().catch(() => null);
      if (!json?.fonte) {
        return NextResponse.json({ erro: "Informe a fonte (pexels ou upload)." }, { status: 400 });
      }
      corpo = json;
    }
  } catch {
    return NextResponse.json({ erro: "Não consegui ler o envio." }, { status: 400 });
  }

  try {
    const resposta = await fetch(
      `${base}/lotes/${encodeURIComponent(loteId)}/posts/${encodeURIComponent(indice)}/arte`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-postei-chave": chave,
          "x-postei-assinante": user.id,
        },
        body: JSON.stringify(corpo),
        // Re-render + Pexels pode passar de 20s.
        signal: AbortSignal.timeout(90000),
      },
    );

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return NextResponse.json(
        { erro: (dados as { erro?: string }).erro || "Não consegui refazer a arte." },
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
