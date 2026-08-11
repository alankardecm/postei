"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type LinkResumo = {
  id: string;
  codigo: string;
  titulo: string;
  destino: string | null;
  cliques: number;
  contatos: number;
};

export function Captacao({ links, base }: { links: LinkResumo[]; base: string }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setCriando(true);
    setErro(null);

    const resposta = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, destino }),
    });
    const dados = await resposta.json();

    setCriando(false);
    if (!resposta.ok) {
      setErro(dados.erro || "Não consegui criar o link.");
      return;
    }
    setTitulo("");
    setDestino("");
    router.refresh();
  }

  async function copiar(codigo: string) {
    await navigator.clipboard.writeText(`${base}/l/${codigo}`);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <section className="mt-12">
      <h2 className="rotulo mb-4">Captação de contatos</h2>

      <form onSubmit={criar} className="rounded-2xl border border-linha bg-branco p-6 sm:p-7">
        <p className="text-sm text-cinza">
          Crie um link, coloque no seu perfil ou nos posts, e veja quantas pessoas clicaram e
          quem deixou contato.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Nome do link</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              maxLength={60}
              placeholder="Consulta de nutrição"
              className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Para onde levar depois (opcional)</span>
            <input
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              type="url"
              placeholder="https://wa.me/5519..."
              className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
            />
          </label>
        </div>

        {erro && (
          <p role="alert" className="mt-4 rounded-xl bg-ink px-4 py-3 text-sm text-tinta">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={criando}
          className="mt-5 rounded-full bg-limao px-5 py-3 font-medium text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {criando ? "Criando…" : "Criar link"}
        </button>
      </form>

      {links.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-linha bg-branco p-5"
            >
              <div className="min-w-0">
                <p className="fonte-display font-bold tracking-tight">{l.titulo}</p>
                <p className="truncate font-mono text-sm text-cinza">
                  {base.replace(/^https?:\/\//, "")}/l/{l.codigo}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="fonte-display text-xl font-bold tabular-nums">{l.cliques}</p>
                  <p className="rotulo">cliques</p>
                </div>
                <div className="text-right">
                  <p className="fonte-display text-xl font-bold tabular-nums text-folha">
                    {l.contatos}
                  </p>
                  <p className="rotulo">contatos</p>
                </div>
                <button
                  type="button"
                  onClick={() => copiar(l.codigo)}
                  className="rounded-full border border-tinta/20 px-4 py-2 text-sm transition-colors hover:border-tinta/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
                >
                  {copiado === l.codigo ? "Copiado" : "Copiar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
