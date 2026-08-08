import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Encerra a sessao. POST de proposito: sair nao pode acontecer por link. */
export async function POST(request: Request) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
