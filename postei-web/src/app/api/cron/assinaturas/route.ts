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

  // ?pendentes=1 -> passada rápida, de dez em dez minutos, só de quem está
  // esperando confirmação. Sem o parâmetro, confere todo mundo (uma vez ao
  // dia), que é o que pega renovação, falha de cobrança e cancelamento.
  const apenasPendentes = new URL(request.url).searchParams.get("pendentes") === "1";

  try {
    const resultados = await sincronizarTodas({ apenasPendentes });
    return NextResponse.json({
      conferidas: resultados.length,
      falhas: resultados.filter((r) => !r.ok).length,
      resultados,
    });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
