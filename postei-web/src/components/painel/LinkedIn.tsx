"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ContaLi = { nome: string | null; expira_em: string } | null;

export function LinkedIn({ conta, aviso }: { conta: ContaLi; aviso?: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function desconectar() {
    setOcupado(true);
    await fetch("/api/linkedin/desconectar", { method: "DELETE" });
    setOcupado(false);
    router.refresh();
  }

  const mensagens: Record<string, string> = {
    conectado: "LinkedIn conectado.",
    recusado: "Você cancelou a autorização no LinkedIn.",
    estado_invalido: "A autorização não conferiu. Tente de novo.",
    falhou: "Não consegui concluir a conexão. Confira se o Secret está no servidor.",
  };

  return (
    <section className="mt-12">
      <h2 className="rotulo mb-4">LinkedIn</h2>

      {aviso && mensagens[aviso] && (
        <p
          role="status"
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            aviso === "conectado" ? "bg-limao text-ink" : "bg-ink text-[#F2F4EE]"
          }`}
        >
          {mensagens[aviso]}
        </p>
      )}

      <div className="rounded-2xl border border-linha bg-branco p-6 sm:p-7">
        {conta ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="fonte-display font-bold tracking-tight">
                {conta.nome ?? "perfil conectado"}
              </p>
              <p className="mt-1 text-sm text-cinza">
                Conexão válida até{" "}
                {new Date(conta.expira_em).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                })}
                . Publica no seu feed pessoal.
              </p>
            </div>
            <button
              type="button"
              onClick={desconectar}
              disabled={ocupado}
              className="rounded-full border border-tinta/20 px-4 py-2 text-sm transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              {ocupado ? "Desconectando…" : "Desconectar"}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-cinza">
              Conecte seu perfil para publicar e agendar daqui. A autorização acontece no
              próprio LinkedIn — <strong className="text-tinta">nunca pedimos sua senha</strong>.
            </p>
            <a
              href="/api/linkedin/conectar"
              className="mt-5 inline-block rounded-full bg-limao px-5 py-3 font-medium text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              Conectar LinkedIn
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
