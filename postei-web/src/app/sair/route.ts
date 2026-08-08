import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Encerra a sessao. POST de proposito: sair nao pode acontecer por link. */
export async function POST(request: Request) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  // Idem: nao usar request.url, que atras do proxy aponta para o host interno.
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.redirect(base, { status: 303 });
}
