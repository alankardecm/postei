"use client";

import { useState } from "react";

export function FormularioContato({
  codigo,
  destino,
}: {
  codigo: string;
  destino: string | null;
}) {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [situacao, setSituacao] = useState<"parado" | "enviando" | "pronto" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setSituacao("enviando");
    setErro(null);

    const resposta = await fetch(`/api/l/${encodeURIComponent(codigo)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, contato }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setSituacao("erro");
      setErro(dados.erro || "Não consegui enviar. Tente de novo.");
      return;
    }

    setSituacao("pronto");
    // Se o link tem destino, leva a pessoa para la depois de confirmar --
    // ela veio buscar alguma coisa, nao preencher formulario.
    if (destino) setTimeout(() => window.location.assign(destino), 1200);
  }

  if (situacao === "pronto") {
    return (
      <p className="rounded-2xl bg-limao px-5 py-6 text-center text-tinta">
        <strong className="fonte-display block text-lg">Contato recebido.</strong>
        <span className="mt-1 block text-sm text-tinta/75">
          {destino ? "Levando você para o próximo passo…" : "Em breve entram em contato."}
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Seu nome</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          maxLength={80}
          autoComplete="name"
          className="rounded-xl border border-linha bg-branco px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">WhatsApp ou e-mail</span>
        <input
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          required
          maxLength={120}
          className="rounded-xl border border-linha bg-branco px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
          placeholder="(19) 90000-0000"
        />
      </label>

      {erro && (
        <p role="alert" className="rounded-xl bg-tinta px-4 py-3 text-sm text-papel">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={situacao === "enviando"}
        className="mt-1 rounded-full bg-tinta px-5 py-3.5 font-medium text-papel transition-transform hover:-translate-y-0.5 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
      >
        {situacao === "enviando" ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
