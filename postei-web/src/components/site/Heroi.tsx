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
  // Rodizio entre os ramos da galeria de vitrine (mostra/): os arquivos vem
  // agrupados; intercalar evita parecer que o produto so atende um ramo.
  const porNicho = new Map<string, Criativo[]>();
  for (const c of criativos) {
    porNicho.set(c.nichoId, [...(porNicho.get(c.nichoId) ?? []), c]);
  }
  const filas = [...porNicho.values()];
  const intercalado: Criativo[] = [];
  for (let i = 0; intercalado.length < criativos.length; i += 1) {
    for (const fila of filas) if (fila[i]) intercalado.push(fila[i]);
  }

  const faixaA = intercalado.filter((_, i) => i % 2 === 0);
  const faixaB = intercalado.filter((_, i) => i % 2 === 1);

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

      {/* A esteira. Duas faixas em sentidos opostos: le como linha de
          producao, e nao como carrossel de depoimento. */}
      <div className="mt-16 flex flex-col gap-4" aria-label="Exemplos de posts gerados pelo Postei">
        <Esteira itens={faixaA} sentido="esquerda" duracao={110} />
        <Esteira itens={faixaB} sentido="direita" duracao={125} />
      </div>
    </section>
  );
}

