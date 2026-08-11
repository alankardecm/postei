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
  const nome = alvo.arquivo.toLowerCase();
  const ehVideo = nome.endsWith(".mp4");
  // Mesmo HMAC da imagem; o caminho no motor muda pela extensão.
  const caminho = ehVideo
    ? `${base}/lotes/${encodeURIComponent(alvo.loteId)}/video/${encodeURIComponent(alvo.arquivo)}`
    : `${base}/lotes/${encodeURIComponent(alvo.loteId)}/imagem/${encodeURIComponent(alvo.arquivo)}`;

  const resposta = await fetch(caminho, {
    headers: {
      "x-postei-chave": process.env.POSTEI_API_KEY || "",
      "x-postei-assinante": alvo.assinanteId,
    },
    cache: "no-store",
  });

  if (!resposta.ok) {
    return new Response(ehVideo ? "Vídeo não encontrado." : "Imagem não encontrada.", {
      status: 404,
    });
  }

  const contentType = ehVideo
    ? "video/mp4"
    : nome.endsWith(".png")
      ? "image/png"
      : "image/jpeg";

  return new Response(resposta.body, {
    headers: {
      "Content-Type": contentType,
      // A Meta busca uma vez; cache curto evita que o endereço expirado
      // continue servindo por meio de intermediários.
      "Cache-Control": "public, max-age=300",
    },
  });
}
