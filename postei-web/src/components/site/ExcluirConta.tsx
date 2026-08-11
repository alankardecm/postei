"use client";

import { useState } from "react";

/**
 * Exclusão em duas etapas: o botão revela um campo onde a pessoa digita o
 * próprio e-mail. Ação irreversível não pode acontecer por clique acidental,
 * e digitar o endereço obriga a ler o que está prestes a fazer.
 */
export function ExcluirConta({ email }: { email: string }) {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [situacao, setSituacao] = useState<"parado" | "apagando" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);

  const confere = confirmacao.trim().toLowerCase() === email.toLowerCase();

  async function apagar() {
    setSituacao("apagando");
    setErro(null);

    const resposta = await fetch("/api/conta", { method: "DELETE" });
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setSituacao("erro");
      setErro(dados.erro || "Não consegui apagar. Tente de novo ou fale com a gente.");
      return;
    }
    // A sessão morre junto com a conta: mandar para a home evita o painel
    // piscar com dados que não existem mais.
    window.location.assign("/");
  }

  if (!aberto) {
    return (
      <div>
        <p className="mb-4">
          Conta conectada: <strong>{email}</strong>
        </p>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-full border border-tinta px-5 py-3 font-medium text-tinta transition-colors hover:bg-limao hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          Quero apagar minha conta
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-tinta bg-branco p-6">
      <p className="text-tinta">
        Para confirmar, digite <strong>{email}</strong> abaixo.
      </p>

      <input
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        autoComplete="off"
        aria-label="Confirme digitando seu e-mail"
        className="mt-4 w-full rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
      />

      {erro && (
        <p role="alert" className="mt-4 rounded-xl bg-ink px-4 py-3 text-sm text-tinta">
          {erro}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={apagar}
          disabled={!confere || situacao === "apagando"}
          className="rounded-full bg-limao px-5 py-3 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {situacao === "apagando" ? "Apagando…" : "Apagar tudo definitivamente"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-full px-5 py-3 text-cinza transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
