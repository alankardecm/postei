"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANOS, type Plano } from "@/lib/planos";

export function Assinatura({
  plano,
  statusPagamento,
  proximoPagamento,
}: {
  plano: Plano;
  statusPagamento: string;
  proximoPagamento: string | null;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoCancelamento, setConfirmando] = useState(false);

  async function assinar(escolhido: Plano) {
    setOcupado(escolhido);
    setErro(null);

    const resposta = await fetch("/api/pagamento/assinar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano: escolhido }),
    });
    const dados = await resposta.json();

    if (!resposta.ok || !dados.checkout) {
      setOcupado(null);
      setErro(dados.erro || "Não consegui abrir o pagamento.");
      return;
    }
    // Leva ao checkout do Mercado Pago: o cartão não passa por aqui.
    window.location.assign(dados.checkout);
  }

  async function cancelar() {
    setOcupado("cancelar");
    const resposta = await fetch("/api/pagamento/cancelar", { method: "POST" });
    setOcupado(null);
    setConfirmando(false);

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setErro(dados.erro || "Não consegui cancelar.");
      return;
    }
    router.refresh();
  }

  const pagante = statusPagamento === "ativa";
  const pendente = statusPagamento === "pendente";

  return (
    <section className="mt-12">
      <h2 className="rotulo mb-4">Assinatura</h2>

      {pendente && (
        <p className="mb-4 rounded-xl bg-areia px-4 py-3 text-sm text-tinta">
          Seu pagamento está sendo confirmado. Assim que o Mercado Pago autorizar, o plano é
          liberado automaticamente — pode levar alguns minutos.
        </p>
      )}

      {erro && (
        <p role="alert" className="mb-4 rounded-xl bg-tinta px-4 py-3 text-sm text-papel">
          {erro}
        </p>
      )}

      {pagante ? (
        <div className="rounded-2xl border border-linha bg-branco p-6">
          <p className="fonte-display text-lg font-bold tracking-tight">
            Plano {PLANOS[plano].nome} · R$ {PLANOS[plano].preco}/mês
          </p>
          <p className="mt-1 text-sm text-cinza">
            {proximoPagamento
              ? `Próxima cobrança em ${new Date(proximoPagamento).toLocaleDateString("pt-BR")}.`
              : "Renovação mensal automática."}
          </p>

          {confirmandoCancelamento ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm text-cinza">
                Você mantém o acesso até o fim do ciclo já pago.
              </span>
              <button
                type="button"
                onClick={cancelar}
                disabled={ocupado === "cancelar"}
                className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-papel disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
              >
                {ocupado === "cancelar" ? "Cancelando…" : "Confirmar cancelamento"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="rounded-full px-3 py-2 text-sm text-cinza hover:text-tinta"
              >
                Voltar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="mt-5 rounded-full border border-tinta/20 px-4 py-2 text-sm transition-colors hover:border-tinta/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["essencial", "profissional", "estudio"] as const).map((id) => {
            const p = PLANOS[id];
            return (
              <div
                key={id}
                className="flex flex-col rounded-2xl border border-linha bg-branco p-5"
              >
                <h3 className="fonte-display font-bold tracking-tight">{p.nome}</h3>
                <p className="mt-2 fonte-display text-2xl font-extrabold tabular-nums">
                  <span className="align-top text-sm font-semibold">R$ </span>
                  {p.preco}
                  <span className="text-sm font-normal text-cinza">/mês</span>
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-cinza">
                  {p.posts} posts · {p.marcas} {p.marcas === 1 ? "marca" : "marcas"}
                </p>
                <button
                  type="button"
                  onClick={() => assinar(id)}
                  disabled={Boolean(ocupado)}
                  className="mt-4 rounded-full bg-tinta px-4 py-2.5 text-sm font-medium text-papel transition-transform hover:-translate-y-0.5 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
                >
                  {ocupado === id ? "Abrindo…" : "Assinar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-sm text-cinza">
        O pagamento acontece no Mercado Pago — o cartão nunca passa pelo Postei.
      </p>
    </section>
  );
}
