import { usuarioAtual } from "@/lib/motor";

/**
 * Serve a imagem do post. Passa pelo painel de propósito: assim a imagem
 * só sai para quem tem sessão, e a chave do motor não vaza para o navegador.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/lotes/[loteId]/imagem/[arquivo]">,
) {
  const user = await usuarioAtual();
  if (!user) return new Response("Faça login.", { status: 401 });

  const { loteId, arquivo } = await params;
  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";

  const resposta = await fetch(
    `${base}/lotes/${encodeURIComponent(loteId)}/imagem/${encodeURIComponent(arquivo)}`,
    {
      headers: {
        "x-postei-chave": process.env.POSTEI_API_KEY || "",
        "x-postei-assinante": user.id,
      },
      cache: "no-store",
    },
  );

  if (!resposta.ok) return new Response("Imagem não encontrada.", { status: 404 });

  return new Response(resposta.body, {
    headers: {
      "Content-Type": arquivo.endsWith(".png") ? "image/png" : "image/jpeg",
      // Sem cache longo: trocar foto re-grava o mesmo nome de arquivo.
      "Cache-Control": "private, no-cache",
    },
  });
}
