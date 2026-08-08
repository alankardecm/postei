import { conferirUrlPublica } from "@/lib/imagem-publica";

/**
 * Entrega a imagem para quem tiver o endereço assinado — sem login.
 *
 * É por aqui que os servidores da Meta baixam o arquivo na hora de publicar.
 * A assinatura amarra o endereço a um arquivo específico e a um prazo curto,
 * então isto não abre o acervo do assinante.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/publico/imagem/[dados]/[assinatura]">,
) {
  const { dados, assinatura } = await params;

  const alvo = conferirUrlPublica(dados, assinatura);
  if (!alvo) return new Response("Endereço inválido ou expirado.", { status: 403 });

  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";
  const resposta = await fetch(
    `${base}/lotes/${encodeURIComponent(alvo.loteId)}/imagem/${encodeURIComponent(alvo.arquivo)}`,
    {
      headers: {
        "x-postei-chave": process.env.POSTEI_API_KEY || "",
        "x-postei-assinante": alvo.assinanteId,
      },
      cache: "no-store",
    },
  );

  if (!resposta.ok) return new Response("Imagem não encontrada.", { status: 404 });

  return new Response(resposta.body, {
    headers: {
      "Content-Type": alvo.arquivo.endsWith(".png") ? "image/png" : "image/jpeg",
      // A Meta busca uma vez; cache curto evita que o endereço expirado
      // continue servindo por meio de intermediários.
      "Cache-Control": "public, max-age=300",
    },
  });
}
