import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { verAssinatura } from "@/lib/mercadopago";
import { sincronizarAssinatura } from "@/lib/assinatura-sync";
import { PLANOS } from "@/lib/planos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confere que o aviso veio mesmo do Mercado Pago.
 *
 * Eles assinam com o segredo da aplicação: o cabeçalho `x-signature` traz
 * `ts` e `v1`, e `v1` é o HMAC-SHA256 de `id:{id};request-id:{req};ts:{ts};`.
 *
 * Não é o que nos protege de fraude -- disso quem cuida é buscar o estado na
 * API deles, e isso continua valendo. Serve para descartar barulho cedo:
 * sem a conferência, qualquer um POSTando aqui faria o servidor abrir uma
 * chamada à API do Mercado Pago para cada requisição.
 *
 * Enquanto o segredo não estiver configurado, deixa passar -- é o que evita
 * derrubar o recebimento no intervalo entre publicar isto e gravar a chave.
 */
function origemConfere(request: Request, id: string) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return true;

  const assinatura = request.headers.get("x-signature");
  if (!assinatura) return false;

  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  if (!partes.ts || !partes.v1) return false;

  const requisicao = request.headers.get("x-request-id") ?? "";
  const manifesto = `id:${id};request-id:${requisicao};ts:${partes.ts};`;
  const esperada = createHmac("sha256", segredo).update(manifesto).digest("hex");

  // Tempo constante: comparar com === vaza, pelo tempo de resposta, quantos
  // caracteres iniciais o atacante acertou.
  const a = Buffer.from(partes.v1);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

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

  if (!origemConfere(request, String(id))) {
    console.error("[postei][webhook] assinatura de origem não confere");
    // 401 e não 500: o Mercado Pago reenvia o que falhou por culpa nossa, e
    // este caso não é. Reenviar não consertaria uma assinatura inválida.
    return NextResponse.json({ erro: "origem não confere" }, { status: 401 });
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
