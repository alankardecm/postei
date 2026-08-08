import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { trocarCodigo, tokenLongo, perfil } from "@/lib/instagram";

/** Volta do Instagram: troca o código por um token de 60 dias e guarda. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const painel = (aviso: string) => NextResponse.redirect(`${base}/painel?ig=${aviso}`);

  const user = await usuarioAtual();
  if (!user) return NextResponse.redirect(`${base}/entrar?de=/painel`);

  // A pessoa pode ter recusado a autorização na tela do Instagram.
  if (url.searchParams.get("error")) return painel("recusado");

  const codigo = url.searchParams.get("code");
  const estado = url.searchParams.get("state");
  const esperado = request.headers.get("cookie")?.match(/ig_estado=([a-f0-9]+)/)?.[1];

  if (!codigo || !estado || estado !== esperado) return painel("estado_invalido");

  try {
    const redirect = `${base}/api/instagram/retorno`;

    const curto = await trocarCodigo({ codigo, redirect });
    const longo = await tokenLongo(curto.access_token);
    const dados = await perfil(longo.access_token);

    const admin = criarClienteAdmin();
    await admin.from("contas_instagram").upsert(
      {
        usuario_id: user.id,
        ig_user_id: dados.user_id,
        username: dados.username,
        token: longo.access_token,
        expira_em: new Date(Date.now() + longo.expires_in * 1000).toISOString(),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "usuario_id,ig_user_id" },
    );

    const resposta = painel("conectado");
    resposta.cookies.delete("ig_estado");
    return resposta;
  } catch (erro) {
    console.error("[postei] falha ao conectar Instagram:", (erro as Error).message);
    return painel("falhou");
  }
}
