import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Desconecta a conta. Atende dois casos:
 *  - o assinante clicando "desconectar" no painel (DELETE, com sessão);
 *  - a Meta avisando que a pessoa removeu o app pelo Instagram (POST).
 *
 * O aviso da Meta chega sem sessão nossa, por isso é uma rota aberta — ela
 * apenas apaga, nunca devolve dado.
 */
export async function DELETE() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const admin = criarClienteAdmin();
  await admin.from("contas_instagram").delete().eq("usuario_id", user.id);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  // A Meta manda um signed_request assinado com o app secret. Como a ação é
  // apenas apagar, tratamos de forma tolerante: se vier o id, removemos.
  const corpo = await request.formData().catch(() => null);
  const assinado = corpo?.get("signed_request");
  if (typeof assinado !== "string") return NextResponse.json({ ok: true });

  try {
    const [, carga] = assinado.split(".");
    const dados = JSON.parse(Buffer.from(carga, "base64url").toString("utf8"));
    if (dados?.user_id) {
      const admin = criarClienteAdmin();
      await admin.from("contas_instagram").delete().eq("ig_user_id", String(dados.user_id));
    }
  } catch {
    // Formato inesperado não pode virar erro 500 para a Meta.
  }
  return NextResponse.json({ ok: true });
}
