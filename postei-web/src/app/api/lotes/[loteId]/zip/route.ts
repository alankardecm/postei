import { usuarioAtual } from "@/lib/motor";

/**
 * Zip do pacote: imagens + LEGENDAS.txt. Passa pelo painel para a chave
 * do motor não sair no navegador e o assinante só baixar o que é dele.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/lotes/[loteId]/zip">,
) {
  const user = await usuarioAtual();
  if (!user) return new Response("Faça login.", { status: 401 });

  const { loteId } = await params;
  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";

  let resposta: Response;
  try {
    resposta = await fetch(`${base}/lotes/${encodeURIComponent(loteId)}/zip`, {
      headers: {
        "x-postei-chave": process.env.POSTEI_API_KEY || "",
        "x-postei-assinante": user.id,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return new Response("O motor de geração não respondeu.", { status: 503 });
  }

  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => "");
    return new Response(texto || "Não consegui montar o zip.", { status: resposta.status });
  }

  const nome =
    /filename="([^"]+)"/.exec(resposta.headers.get("content-disposition") || "")?.[1] ||
    "postei-pacote.zip";

  return new Response(resposta.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
