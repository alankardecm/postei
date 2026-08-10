import { NextResponse } from "next/server";
import { sincronizarTodas } from "@/lib/assinatura-sync";

/**
 * Confere todas as assinaturas contra o Mercado Pago, uma vez por dia.
 *
 * É a rede de segurança do pagamento: pega o aviso que se perdeu, a
 * renovação que entrou, a cobrança que falhou e o cancelamento feito pelo
 * cliente direto no Mercado Pago. Sem isto, o único caminho para o plano
 * mudar seria o webhook -- e webhook que não chega não deixa rastro.
 */
export async function POST(request: Request) {
  const segredo = process.env.POSTEI_API_KEY;
  if (!segredo || request.headers.get("x-postei-chave") !== segredo) {
    return NextResponse.json({ erro: "Chave inválida." }, { status: 401 });
  }

  try {
    const resultados = await sincronizarTodas();
    return NextResponse.json({
      conferidas: resultados.length,
      falhas: resultados.filter((r) => !r.ok).length,
      resultados,
    });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
