import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { trocarCodigo, perfil, validarEstadoOAuth } from "@/lib/linkedin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const painel = (aviso: string) => NextResponse.redirect(`${base}/painel?li=${aviso}`);

  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(`${base}/entrar?de=/painel`);

  if (url.searchParams.get("error")) return painel("recusado");

  const codigo = url.searchParams.get("code")?.replace(/#$/, "") ?? null;
  const estado = url.searchParams.get("state");
  const cookieEstado = request.headers.get("cookie")?.match(/li_estado=([^;]+)/)?.[1];
  const estadoOk =
    Boolean(estado) && (estado === cookieEstado || validarEstadoOAuth(estado!, user.id));

  if (!codigo || !estado || !estadoOk) {
    console.error("[postei][li] estado_invalido", {
      temCodigo: Boolean(codigo),
      temEstado: Boolean(estado),
    });
    return painel("estado_invalido");
  }

  try {
    const redirect = `${base}/api/linkedin/retorno`;
    const tokens = await trocarCodigo({ codigo, redirect });
    const dados = await perfil(tokens.access_token);

    const admin = criarClienteAdmin();
    await admin.from("contas_linkedin").upsert(
      {
        usuario_id: user.id,
        person_urn: dados.personUrn,
        nome: dados.nome,
        token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expira_em: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "usuario_id" },
    );

    const resposta = painel("conectado");
    resposta.cookies.delete("li_estado");
    return resposta;
  } catch (erro) {
    console.error("[postei] falha ao conectar LinkedIn:", (erro as Error).message);
    return painel("falhou");
  }
}
