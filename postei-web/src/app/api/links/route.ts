import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin, gerarCodigo } from "@/lib/supabase/admin";

/** Cria um link de captação para o usuário da sessão. */
export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const titulo = typeof corpo?.titulo === "string" ? corpo.titulo.trim() : "";
  const destinoBruto = typeof corpo?.destino === "string" ? corpo.destino.trim() : "";

  if (!titulo) {
    return NextResponse.json({ erro: "Dê um nome ao link." }, { status: 400 });
  }

  // Destino é opcional, mas se vier precisa ser http(s): sem isso o link
  // aceitaria "javascript:" e viraria um vetor de ataque contra quem clica.
  let destino: string | null = null;
  if (destinoBruto) {
    try {
      const url = new URL(destinoBruto);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      destino = url.toString();
    } catch {
      return NextResponse.json(
        { erro: "O destino precisa ser um endereço começando com http:// ou https://" },
        { status: 400 },
      );
    }
  }

  const supabase = criarClienteAdmin();
  const { data, error } = await supabase
    .from("links")
    .insert({
      usuario_id: user.id,
      codigo: gerarCodigo(),
      titulo: titulo.slice(0, 60),
      destino,
      captura: corpo?.captura !== false,
    })
    .select("codigo")
    .single();

  if (error) {
    return NextResponse.json({ erro: "Não consegui criar o link." }, { status: 500 });
  }
  return NextResponse.json({ codigo: data.codigo }, { status: 201 });
}
