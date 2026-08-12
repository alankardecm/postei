import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { urlDeAutorizacao, criarEstadoOAuth } from "@/lib/instagram";

const RETORNO = "/api/instagram/retorno";

/** Começa a autorização: leva a pessoa para o Instagram. */
export async function GET(request: Request) {
  // Atras do Traefik, `request.url` traz o host INTERNO (localhost:4720) --
  // redirecionar com ele manda o visitante para um endereco inexistente.
  // O endereco publico vem sempre da configuracao.
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const hostPublico = new URL(base).host;

  // Se a pessoa abriu o painel no host legado (ou www) e clicou Conectar,
  // o cookie ficaria nesse host e a volta do OAuth cai no SITE_URL — state
  // nao confere. Forca o fluxo a comecar no host oficial.
  const hostPedido =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (hostPedido && hostPedido !== hostPublico && !hostPedido.startsWith("127.0.0.1")) {
    return NextResponse.redirect(`${base}/api/instagram/conectar`);
  }

  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(`${base}/entrar?de=/painel`);

  // State assinado com o id do usuario (CSRF + dominio). Cookie e reforco.
  const estado = criarEstadoOAuth(user.id);

  const redirect = `${base}${RETORNO}`;
  const resposta = NextResponse.redirect(urlDeAutorizacao({ redirect, estado }));
  resposta.cookies.set("ig_estado", estado, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });
  return resposta;
}
