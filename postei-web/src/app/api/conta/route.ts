import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Exclusão de conta e de todos os dados associados.
 *
 * A ordem importa: primeiro os pacotes no motor, depois as linhas do banco,
 * e o cadastro por último. Se o cadastro caísse primeiro e algo falhasse
 * depois, sobrariam dados sem dono — impossíveis de localizar e apagar.
 */
export async function DELETE() {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const relatorio: Record<string, string> = {};

  // 1. Pacotes gerados (imagens e textos no servidor).
  try {
    const resposta = await fetch(
      `${process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710"}/assinante`,
      {
        method: "DELETE",
        headers: {
          "x-postei-chave": process.env.POSTEI_API_KEY || "",
          "x-postei-assinante": user.id,
        },
      },
    );
    relatorio.pacotes = resposta.ok ? "removidos" : `falhou (${resposta.status})`;
  } catch {
    relatorio.pacotes = "motor indisponível";
  }

  const admin = criarClienteAdmin();

  // 2. Links e, em cascata, cliques e contatos.
  const { error: erroLinks } = await admin.from("links").delete().eq("usuario_id", user.id);
  relatorio.captacao = erroLinks ? `falhou: ${erroLinks.message}` : "removida";

  // 3. O cadastro. Só depois de tudo que dependia dele.
  const { error: erroConta } = await admin.auth.admin.deleteUser(user.id);
  if (erroConta) {
    return NextResponse.json(
      { erro: "Apaguei seus dados, mas não consegui remover o cadastro. Fale com a gente.", relatorio },
      { status: 500 },
    );
  }
  relatorio.cadastro = "removido";

  return NextResponse.json({ ok: true, relatorio });
}
