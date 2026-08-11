"use client";

import Link from "next/link";
import SplitText from "@/components/SplitText";
import { Esteira } from "@/components/site/Esteira";
import { criativos, type Criativo } from "@/lib/conteudo";

/**
 * A tese da pagina e o proprio produto: em vez de descrever o que sai, a
 * faixa abaixo do titulo mostra criativos reais. Nao listamos o catalogo de
 * nichos na capa — catalogo muda no motor; a landing fala em "seu ramo" e
 * mostra so exemplos na esteira.
 */
export function Heroi() {
  // Poucos criativos na esteira: 1 com foto por ramo (no max. 6 no total).
  // Duas faixas cheias com 12 artes pesavam a pagina e competiam com o resto.
  const porNicho = new Map<string, Criativo[]>();
  for (const c of criativos) {
    if (!c.comFoto) continue;
    const lista = porNicho.get(c.nichoId) ?? [];
    if (lista.length === 0) lista.push(c);
    porNicho.set(c.nichoId, lista);
  }
  const amostra = [...porNicho.values()].flat().slice(0, 6);

  return (
    <section className="relative overflow-hidden pt-16 pb-14 sm:pt-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-5">Conteúdo para redes sociais</p>

        <SplitText
          tag="h1"
          text="Seu mês de conteúdo, pronto."
          className="fonte-display block max-w-4xl text-[clamp(2.6rem,7.5vw,5.2rem)] font-extrabold leading-[.98] tracking-[-.035em] text-balance"
          splitType="words"
          delay={38}
          duration={0.7}
          from={{ opacity: 0, y: 44 }}
          to={{ opacity: 1, y: 0 }}
        />

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-cinza sm:text-xl">
          Diga o ramo do seu negócio e receba o mês inteiro de posts: imagem, legenda,
          hashtags e chamada. Você revisa e publica — sem começar do zero toda semana.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/criar-conta"
            className="rounded-full bg-limao px-6 py-3.5 font-medium text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Começar agora
          </Link>
          <a
            href="#como"
            className="rounded-full border border-tinta/20 px-6 py-3.5 font-medium transition-colors hover:border-tinta/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Ver como funciona
          </a>
        </div>

        {/* Exemplos, nao catalogo: o motor pode ganhar nicho sem redeploy da capa. */}
        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-cinza">
          Serve para <span className="text-tinta">vários ramos</span> — de receitas e
          finanças a fé, bem-estar, nutrição, consultoria e{" "}
          <span className="text-tinta">muito mais</span>. O tom e as regras mudam com o
          seu negócio; se o seu ainda não estiver na lista, a gente inclui.
        </p>
      </div>

      {/* Uma faixa só, com amostra enxuta — prova visual sem poluir. */}
      <div className="mt-16" aria-label="Exemplos de posts gerados pelo Postei">
        <Esteira itens={amostra} sentido="esquerda" duracao={90} />
      </div>
    </section>
  );
}

