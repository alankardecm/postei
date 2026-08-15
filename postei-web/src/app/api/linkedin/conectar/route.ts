import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { urlDeAutorizacao, criarEstadoOAuth } from "@/lib/linkedin";

const RETORNO = "/api/linkedin/retorno";

export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const hostPublico = new URL(base).host;
  const hostPedido =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (hostPedido && hostPedido !== hostPublico && !hostPedido.startsWith("127.0.0.1")) {
    return NextResponse.redirect(`${base}/api/linkedin/conectar`);
  }

  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(`${base}/entrar?de=/painel`);

  try {
    const estado = criarEstadoOAuth(user.id);
    const redirect = `${base}${RETORNO}`;
    const resposta = NextResponse.redirect(urlDeAutorizacao({ redirect, estado }));
    resposta.cookies.set("li_estado", estado, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
    return resposta;
  } catch (erro) {
    console.error("[postei][li] conectar:", (erro as Error).message);
    return NextResponse.redirect(`${base}/painel?li=falhou`);
  }
}
