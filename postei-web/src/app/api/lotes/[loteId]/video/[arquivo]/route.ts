import { usuarioAtual } from "@/lib/motor";

/**
 * Serve o MP4 do post para o assinante logado (preview no painel).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ loteId: string; arquivo: string }> },
) {
  const user = await usuarioAtual();
  if (!user) return new Response("Faça login.", { status: 401 });

  const { loteId, arquivo } = await params;
  if (!/\.mp4$/i.test(arquivo)) {
    return new Response("Arquivo inválido.", { status: 400 });
  }

  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";

  const resposta = await fetch(
    `${base}/lotes/${encodeURIComponent(loteId)}/video/${encodeURIComponent(arquivo)}`,
    {
      headers: {
        "x-postei-chave": process.env.POSTEI_API_KEY || "",
        "x-postei-assinante": user.id,
      },
      cache: "no-store",
    },
  );

  if (!resposta.ok) return new Response("Vídeo não encontrado.", { status: 404 });

  return new Response(resposta.body, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
