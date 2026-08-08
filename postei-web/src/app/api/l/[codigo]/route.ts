import { NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Recebe o contato deixado na página pública do link.
 *
 * Rota aberta de propósito — quem preenche é o seguidor do assinante, que
 * não tem conta. A proteção é o código do link ser o único jeito de chegar
 * aqui, mais o limite de tamanho dos campos.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/l/[codigo]">) {
  const { codigo } = await params;
  const corpo = await request.json().catch(() => null);

  const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  const contato = typeof corpo?.contato === "string" ? corpo.contato.trim() : "";

  if (!nome || !contato) {
    return NextResponse.json({ erro: "Preencha nome e contato." }, { status: 400 });
  }
  if (nome.length > 80 || contato.length > 120) {
    return NextResponse.json({ erro: "Dados muito longos." }, { status: 400 });
  }

  const supabase = criarClienteAdmin();
  const { data: link } = await supabase
    .from("links")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!link) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });

  const { error } = await supabase
    .from("contatos")
    .insert({ link_id: link.id, nome, contato });

  if (error) {
    return NextResponse.json({ erro: "Não consegui salvar seu contato." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
