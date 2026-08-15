import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function DELETE() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const admin = criarClienteAdmin();
  await admin.from("contas_linkedin").delete().eq("usuario_id", user.id);
  return NextResponse.json({ ok: true });
}
