import { NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { verAssinatura } from "@/lib/mercadopago";
import { sincronizarAssinatura } from "@/lib/assinatura-sync";
import { PLANOS } from "@/lib/planos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Avisos do Mercado Pago.
 *
 * Rota aberta — quem chama é o gateway, não um usuário logado. Por isso
 * **nada do corpo é levado a sério**: pegamos apenas o id e consultamos o
 * estado real na API deles. Sem isso, qualquer um poderia POSTar aqui
 * dizendo "assinatura autorizada" e liberar um plano de graça.
 */
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);

  const id = corpo?.data?.id ?? corpo?.id;
  const tipo = corpo?.type ?? corpo?.topic;

  // O Mercado Pago manda avisos de vários assuntos no mesmo endereço.
  if (!id || !String(tipo ?? "").includes("preapproval")) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const admin = criarClienteAdmin();

  try {
    const assinatura = await verAssinatura(String(id));
    const [referencia, plano] = String(assinatura.external_reference ?? "").split(":");
    // A referência devia ser o id do usuário, mas ela vem de fora e pode ser
    // qualquer coisa (inclusive de uma assinatura criada à mão para teste).
    // Gravar lixo numa coluna uuid derruba o insert inteiro e perderíamos o
    // registro do evento -- justamente o que serve para depurar depois.
    const usuarioId = UUID.test(referencia ?? "") ? referencia : null;

    const { error: erroEvento } = await admin.from("pagamentos_eventos").insert({
      usuario_id: usuarioId,
      preapproval_id: assinatura.id,
      tipo: String(tipo),
      status: assinatura.status,
      bruto: corpo,
    });
    // O supabase-js DEVOLVE o erro, não o lança. Sem esta checagem uma falha
    // de banco viraria HTTP 200, o Mercado Pago nunca reenviaria o aviso e
    // uma assinatura paga ficaria sem ser liberada, sem deixar rastro.
    if (erroEvento) throw new Error(`gravar evento: ${erroEvento.message}`);

    if (!usuarioId || !(plano in PLANOS)) {
      return NextResponse.json({ ok: true, semVinculo: true });
    }

    // A decisão de o que o pagamento faz com o acesso vive num lugar só. O
    // webhook é apenas o gatilho rápido; a rotina diária chama exatamente
    // esta função. Duas cópias da regra se desencontrariam com o tempo.
    const r = await sincronizarAssinatura(usuarioId);

    return NextResponse.json({ ok: true, ...r });
  } catch (erro) {
    console.error("[postei][webhook]", (erro as Error).message);
    // Devolver erro faz o Mercado Pago reenviar depois, que é o desejado
    // quando a falha é nossa (banco fora, timeout).
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}

/** O Mercado Pago valida o endereço com um GET antes de usar. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
