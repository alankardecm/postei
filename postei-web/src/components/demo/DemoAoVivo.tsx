"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CartaoIg } from "@/components/site/CartaoIg";
import { criativos, nichos } from "@/lib/conteudo";

export function DemoAoVivo() {
  const [nichoId, setNichoId] = useState(nichos[0]?.id ?? "receitas");
  const [marca, setMarca] = useState("suamarca");
  const [quem, setQuem] = useState("");
  const [aberto, setAberto] = useState(false);

  const posts = useMemo(() => {
    const doRamo = criativos.filter((c) => c.nichoId === nichoId);
    const comFoto = doRamo.filter((c) => c.comFoto);
    const base = (comFoto.length >= 3 ? comFoto : doRamo).slice(0, 3);
    return base;
  }, [nichoId]);

  const nome = marca.trim() || "suamarca";

  return (
    <section id="demo" className="border-t border-linha bg-branco py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Demo ao vivo</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-.025em] text-balance">
          Escolhe o ramo. Vê três posts. Sem cadastro.
        </h2>
        <p className="mt-4 max-w-xl text-cinza">
          O mês inteiro nasce no painel. Aqui você sente o tom — e, se quiser, cola quem você é.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {nichos.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setNichoId(n.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                n.id === nichoId ? "border-ink bg-ink text-limao" : "border-linha bg-papel hover:border-folha/50"
              }`}
            >
              {n.nome}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Nome do perfil</span>
            <input
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="rounded-xl border border-linha bg-papel px-4 py-3 outline-none focus:border-folha"
              placeholder={nichoId === "telecom-b2b" ? "netturbotelecom" : "cozinhaminha"}
            />
          </label>
        </div>

        <button
          type="button"
          className="mt-4 text-sm font-medium text-folha underline-offset-4 hover:underline"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? "Fechar DNA da marca" : "Colocar quem você é (DNA) — é o que tira o texto genérico"}
        </button>

        {aberto ? (
          <label className="mt-4 flex max-w-xl flex-col gap-1.5">
            <span className="text-sm font-medium">Quem é você (DNA do negócio)</span>
            <textarea
              value={quem}
              onChange={(e) => setQuem(e.target.value)}
              rows={2}
              placeholder={
                nichoId === "telecom-b2b"
                  ? "Operadora corporativa em Campinas com link dedicado, fibra própria, Lan2Lan e NOC 24/7."
                  : "Nutricionista, atendo mulheres em pós-parto."
              }
              className="resize-none rounded-xl border border-linha bg-papel px-3 py-2.5 text-sm outline-none focus:border-folha"
            />
          </label>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.arquivo} className="flex flex-col">
              <CartaoIg arquivo={post.arquivo} titulo={post.titulo} marca={nome} />
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-cinza">
                {post.titulo}.{" "}
                {nichoId === "telecom-b2b"
                  ? "Conteúdo executivo com precisão técnica para diretores e tomadores de decisão de TI."
                  : "Sem aula, sem recorte genérico — um passo que cabe no dia."}
                {quem.trim() ? ` — ${quem.trim()}` : ""}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/criar-conta" className="btn-limao inline-flex rounded-full bg-limao px-7 py-3.5 font-semibold text-ink">
            Gostou? Gerar o mês no painel
          </Link>
          <p className="text-sm text-cinza">Sem cartão. 2 posts de teste.</p>
        </div>
      </div>
    </section>
  );
}
