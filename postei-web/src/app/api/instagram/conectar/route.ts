import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { usuarioAtual } from "@/lib/motor";
import { urlDeAutorizacao } from "@/lib/instagram";

const RETORNO = "/api/instagram/retorno";

/** Começa a autorização: leva a pessoa para o Instagram. */
export async function GET(request: Request) {
  // Atras do Traefik, `request.url` traz o host INTERNO (localhost:4720) --
  // redirecionar com ele manda o visitante para um endereco inexistente.
  // O endereco publico vem sempre da configuracao.
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(`${base}/entrar?de=/painel`);

  // `state` guardado em cookie e conferido na volta: sem isso, alguém poderia
  // induzir você a concluir a autorização de OUTRA conta do Instagram na sua
  // sessão (CSRF), e o painel passaria a publicar no perfil do atacante.
  const estado = randomBytes(16).toString("hex");

  const resposta = NextResponse.redirect(
    urlDeAutorizacao({ redirect: `${base}${RETORNO}`, estado }),
  );
  resposta.cookies.set("ig_estado", estado, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return resposta;
}
