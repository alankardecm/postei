import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente do Supabase para Server Components e Route Handlers.
 *
 * No Next 16 `cookies()` e ASSINCRONO -- o modo sincrono de compatibilidade
 * foi removido de vez na v16, entao esta funcao precisa ser await.
 */
export async function criarClienteServidor() {
  const armazem = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return armazem.getAll();
        },
        setAll(aDefinir) {
          try {
            aDefinir.forEach(({ name, value, options }) =>
              armazem.set(name, value, options),
            );
          } catch {
            // Server Component nao pode escrever cookie. Quem renova a
            // sessao e o proxy.ts, entao ignorar aqui e seguro.
          }
        },
      },
    },
  );
}
