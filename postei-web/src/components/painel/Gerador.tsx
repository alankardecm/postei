"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Nicho } from "@/lib/motor";

type Situacao = "parado" | "enviando" | "gerando" | "pronto" | "erro";

/** Quanto tempo esperar entre uma consulta de andamento e a proxima. */
const INTERVALO_CONSULTA_MS = 4000;

export function Gerador({ nichos, volumes }: { nichos: Nicho[]; volumes: number[] }) {
  const router = useRouter();
  const [rede, setRede] = useState<"instagram" | "linkedin" | "ambos">("instagram");
  const [nicho, setNicho] = useState(nichos[0]?.id ?? "");
  const [marca, setMarca] = useState("");
  const [quantidade, setQuantidade] = useState(volumes[0] ?? 2);
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
      body: JSON.stringify({ nicho, marca, quantidade, rede }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setSituacao("erro");
      // 402 é cota esgotada: a mensagem do servidor já explica o limite.
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
      <p className="rotulo mb-2">Criação com IA</p>
      <h2 className="fonte-display text-2xl font-bold tracking-tight">Uma nova direção para o seu conteúdo.</h2>
      <p className="mt-1 text-sm text-cinza">
        Primeiro a rede. Depois o ramo e o nome do perfil.
      </p>

      <fieldset className="mt-6" disabled={ocupado}>
        <legend className="rotulo mb-2">Onde vai postar</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { id: "instagram" as const, nome: "Instagram", desc: "Card 4:5, legenda curta" },
              { id: "linkedin" as const, nome: "LinkedIn", desc: "Card 1:1, texto de feed" },
              { id: "ambos" as const, nome: "Os dois", desc: "As duas artes e legendas" },
            ] as const
          ).map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setRede(opcao.id)}
              aria-pressed={rede === opcao.id}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                rede === opcao.id
                  ? "border-limao bg-limao text-ink"
                  : "border-linha hover:border-limao/40"
              } disabled:opacity-60`}
            >
              <span className="block font-semibold">{opcao.nome}</span>
              <span className={`mt-0.5 block text-xs ${rede === opcao.id ? "text-ink/70" : "text-cinza"}`}>
                {opcao.desc}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Ramo</span>
          <select
            value={nicho}
            onChange={(e) => {
              const id = e.target.value;
              setNicho(id);
              if (id === "postei-marca") {
                setMarca((m) => m.trim() || "Postei");
                setQuantidade((q) => (q > 5 ? 2 : q));
              }
              if (id === "am-consultoria") {
                setMarca((m) => m.trim() || "AM Consultoria");
                setQuantidade((q) => (q > 5 ? 2 : q));
              }
            }}
            disabled={ocupado}
            className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha disabled:opacity-60"
          >
            {nichos.map((n) => (
              <option key={n.id} value={n.id}>
                {n.interno ? `${n.nome} · marca` : n.nome}
              </option>
            ))}
          </select>
          {(nicho === "postei-marca" || nicho === "am-consultoria") && (
            <span className="mt-1 text-xs text-cinza">
              {nicho === "am-consultoria"
                ? "Direção editorial AM: grafite, prata, ciano e imagens conceituais. Até 5 posts por lote; revise texto e arte antes de publicar."
                : "Depois do pacote, use Gerar Reel no anúncio — câmera lenta, texto parado."}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nome do perfil</span>
          <input
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            disabled={ocupado}
            required
            maxLength={40}
            placeholder={rede === "linkedin" ? "Seu nome no LinkedIn" : "@seuperfil"}
            className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha disabled:opacity-60"
          />
        </label>
      </div>

      <fieldset className="mt-5" disabled={ocupado}>
        <legend className="rotulo mb-2">Quantos posts</legend>
        <div className="flex flex-wrap gap-2">
          {volumes.filter(v => nicho !== "am-consultoria" || v <= 5).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setQuantidade(v)}
              aria-pressed={quantidade === v}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                quantidade === v
                  ? "border-limao bg-limao text-ink"
                  : "border-linha hover:border-limao/40"
              } disabled:opacity-60`}
            >
              {v}
            </button>
          ))}
          <span className="self-center text-sm text-cinza">
            {nicho === "am-consultoria" ? "a criação das imagens pode levar alguns minutos" : quantidade >= 30
              ? "um mês inteiro — leva uns 3 minutos"
              : volumes.length === 1
                ? "é o que o teste inclui"
                : "leva menos de 1 minuto"}
          </span>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={ocupado}
        className="mt-7 rounded-full bg-limao px-6 py-3.5 font-medium text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
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
            situacao === "erro" ? "bg-ink text-tinta" : "bg-limao text-ink"
          }`}
        >
          {mensagem}
        </p>
      )}
    </form>
  );
}
