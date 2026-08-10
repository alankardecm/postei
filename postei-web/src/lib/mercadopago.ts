import { PLANOS, type Plano } from "@/lib/planos";

/**
 * Assinatura recorrente no Mercado Pago.
 *
 * Usamos o modelo "sem plano associado": criamos uma preapproval por
 * assinante e mandamos ele para o checkout do próprio Mercado Pago. Assim
 * o cartão nunca passa pelo nosso servidor — não guardamos, não vemos, e
 * a exigência de segurança de dados de cartão continua sendo deles.
 *
 * ⚠️ Só CARTÃO cobra automaticamente. Pix e boleto na assinatura do Mercado
 * Pago são emitidos e enviados por e-mail, e o cliente precisa pagar todo
 * mês — o que gera cancelamento silencioso por esquecimento.
 */

const API = "https://api.mercadopago.com";

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return t;
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });

  const texto = await resposta.text();
  let dados: unknown = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    throw new Error(`Mercado Pago devolveu resposta ilegível: ${texto.slice(0, 150)}`);
  }

  if (!resposta.ok) {
    const e = dados as { message?: string; error?: string };
    throw new Error(`Mercado Pago (${resposta.status}): ${e?.message || e?.error || "erro"}`);
  }
  return dados as T;
}

export type Preapproval = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  init_point?: string;
  external_reference?: string;
  next_payment_date?: string;
  payer_email?: string;
};

export async function criarAssinatura({
  plano,
  email,
  usuarioId,
  retorno,
  notificacao,
}: {
  plano: Exclude<Plano, "teste">;
  email: string;
  usuarioId: string;
  retorno: string;
  notificacao: string;
}) {
  const config = PLANOS[plano];

  return chamar<Preapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `Postei — plano ${config.nome}`,
      // Amarra a assinatura ao usuário: é por aqui que o webhook descobre
      // de quem é o pagamento, sem depender do e-mail (que pode divergir
      // do cadastro se a pessoa pagar com outra conta).
      external_reference: `${usuarioId}:${plano}`,
      payer_email: email,
      back_url: retorno,
      // O endereço do aviso vai no próprio pedido: assim não depende de
      // configuração no painel do Mercado Pago, que muda de lugar e é fácil
      // de esquecer ao criar uma aplicação nova.
      notification_url: notificacao,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(String(config.preco).replace(",", ".")),
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });
}

/**
 * Consulta o estado real no Mercado Pago.
 *
 * O webhook diz apenas QUE algo mudou; a verdade vem daqui. Confiar no
 * corpo da notificação permitiria a qualquer um POSTar no nosso webhook
 * dizendo "assinatura autorizada".
 */
export function verAssinatura(id: string) {
  return chamar<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

export function cancelarAssinatura(id: string) {
  return chamar<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/** Traduz o estado do gateway para o nosso. */
export function situacaoDe(status: Preapproval["status"]) {
  return (
    {
      pending: "pendente",
      authorized: "ativa",
      paused: "pausada",
      cancelled: "cancelada",
    } as const
  )[status];
}
