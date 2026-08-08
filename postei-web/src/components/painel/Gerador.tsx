"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Nicho } from "@/lib/motor";

type Situacao = "parado" | "enviando" | "gerando" | "pronto" | "erro";

const VOLUMES = [5, 10, 30];

/** Quanto tempo esperar entre uma consulta de andamento e a proxima. */
const INTERVALO_CONSULTA_MS = 4000;

export function Gerador({ nichos }: { nichos: Nicho[] }) {
  const router = useRouter();
  const [nicho, setNicho] = useState(nichos[0]?.id ?? "");
  const [marca, setMarca] = useState("");
  const [quantidade, setQuantidade] = useState(10);
  const [situacao, setSituacao] = useState<Situacao>("parado");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const cronometro = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cronometro.current) clearInterval(cronometro.current);
    };
  }, []);

  async function acompanhar(id: string) {
    // Consulta em intervalo fixo ate terminar. O motor guarda a tarefa em
    // memoria por uma hora, entao nao ha risco de consultar algo expirado
    // dentro de uma geracao normal.
    while (true) {
      await new Promise((r) => setTimeout(r, INTERVALO_CONSULTA_MS));

      const resposta = await fetch(`/api/tarefas/${id}`, { cache: "no-store" });
      const dados = await resposta.json();

      if (!resposta.ok) {
        return { ok: false, texto: dados.erro || "Perdi o contato com a geração." };
      }
      if (dados.situacao === "pronta") {
        const r = dados.resultado;
        return {
          ok: true,
          texto: r.parcial
            ? `Saíram ${r.posts} dos ${r.solicitados} posts — a cota do provedor limitou o restante.`
            : `Pronto: ${r.posts} posts gerados.`,
        };
      }
      if (dados.situacao === "falhou") {
        return { ok: false, texto: dados.erro || "A geração falhou." };
      }
    }
  }

  async function gerar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagem(null);
    setSituacao("enviando");
    setSegundos(0);

    const resposta = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nicho, marca, quantidade }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setSituacao("erro");
      setMensagem(dados.erro || "Não consegui iniciar a geração.");
      return;
    }

    setSituacao("gerando");
    cronometro.current = setInterval(() => setSegundos((s) => s + 1), 1000);

    const fim = await acompanhar(dados.id);

    if (cronometro.current) clearInterval(cronometro.current);
    setSituacao(fim.ok ? "pronto" : "erro");
    setMensagem(fim.texto);
    if (fim.ok) router.refresh();
  }

  const ocupado = situacao === "enviando" || situacao === "gerando";

  return (
    <form onSubmit={gerar} className="rounded-2xl border border-linha bg-branco p-6 sm:p-7">
      <h2 className="fonte-display text-lg font-bold tracking-tight">Gerar um pacote</h2>
      <p className="mt-1 text-sm text-cinza">
        Escolha o ramo e o nome do perfil. O resto é com o Postei.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Ramo</span>
          <select
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            disabled={ocupado}
            className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha disabled:opacity-60"
          >
            {nichos.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nome do perfil</span>
          <input
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            disabled={ocupado}
            required
            maxLength={40}
            placeholder="@seuperfil"
            className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha disabled:opacity-60"
          />
        </label>
      </div>

      <fieldset className="mt-5" disabled={ocupado}>
        <legend className="rotulo mb-2">Quantos posts</legend>
        <div className="flex flex-wrap gap-2">
          {VOLUMES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setQuantidade(v)}
              aria-pressed={quantidade === v}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                quantidade === v
                  ? "border-tinta bg-tinta text-papel"
                  : "border-linha hover:border-tinta/40"
              } disabled:opacity-60`}
            >
              {v}
            </button>
          ))}
          <span className="self-center text-sm text-cinza">
            {quantidade === 30 ? "um mês inteiro — leva uns 3 minutos" : "leva menos de 1 minuto"}
          </span>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={ocupado}
        className="mt-7 rounded-full bg-tinta px-6 py-3.5 font-medium text-papel transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
      >
        {situacao === "gerando"
          ? `Gerando… ${segundos}s`
          : situacao === "enviando"
            ? "Começando…"
            : "Gerar pacote"}
      </button>

      {situacao === "gerando" && (
        <p className="mt-4 text-sm text-cinza" role="status">
          Pode fechar esta aba — a geração continua no servidor e o pacote aparece na lista
          quando terminar.
        </p>
      )}

      {mensagem && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            situacao === "erro" ? "bg-tinta text-papel" : "bg-limao text-tinta"
          }`}
        >
          {mensagem}
        </p>
      )}
    </form>
  );
}
