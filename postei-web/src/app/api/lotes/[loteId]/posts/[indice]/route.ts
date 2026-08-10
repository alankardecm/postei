import { NextResponse } from "next/server";
import { usuarioAtual, ErroMotor } from "@/lib/motor";
import { assinaturaDe } from "@/lib/cota";
import { PLANOS } from "@/lib/planos";

/** Edita o texto de um post. O assinante revisa antes de publicar. */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/lotes/[loteId]/posts/[indice]">,
) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  // A trava é no servidor, não só na tela: esconder o botão não impede
  // ninguém de chamar a rota direto.
  const assinatura = await assinaturaDe(user.id);
  if (!PLANOS[assinatura.plano].podeEditar) {
    return NextResponse.json(
      { erro: "Editar o texto faz parte dos planos pagos." },
      { status: 402 },
    );
  }

  const { loteId, indice } = await params;
  const corpo = await request.json().catch(() => null);

  const base = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";

  try {
    const resposta = await fetch(
      `${base}/lotes/${encodeURIComponent(loteId)}/posts/${encodeURIComponent(indice)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-postei-chave": process.env.POSTEI_API_KEY || "",
          // O assinante vem da SESSÃO: sem isso daria para editar o pacote
          // de outra pessoa trocando o id no navegador.
          "x-postei-assinante": user.id,
        },
        body: JSON.stringify(corpo),
      },
    );

    const dados = await resposta.json();
    if (!resposta.ok) {
      return NextResponse.json({ erro: dados.erro || "Não consegui salvar." }, { status: resposta.status });
    }
    return NextResponse.json(dados);
  } catch (erro) {
    const e = erro as ErroMotor;
    return NextResponse.json({ erro: e.message }, { status: 503 });
  }
}
