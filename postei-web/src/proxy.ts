import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessao do Supabase a cada requisicao e protege as rotas privadas.
 *
 * ATENCAO: no Next 16 o arquivo `middleware.ts` foi renomeado para `proxy.ts`
 * e a funcao exportada precisa se chamar `proxy`. O runtime e sempre nodejs
 * (edge nao e suportado aqui).
 */
const ROTAS_PRIVADAS = ["/painel"];

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(aDefinir) {
          aDefinir.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          aDefinir.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida o token no servidor. Nao trocar por getSession(), que
  // apenas le o cookie e aceitaria um token forjado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPrivada = ROTAS_PRIVADAS.some((r) => caminho.startsWith(r));

  if (ehPrivada && !user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("de", caminho);
    return NextResponse.redirect(destino);
  }

  // Quem ja entrou nao precisa ver as telas de acesso.
  if (user && (caminho === "/entrar" || caminho === "/criar-conta")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/painel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|mostra|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
