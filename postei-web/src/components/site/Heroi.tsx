"use client";

import Link from "next/link";
import SplitText from "@/components/SplitText";
import { Esteira } from "@/components/site/Esteira";
import { criativos, nichos, type Criativo } from "@/lib/conteudo";

/**
 * A tese da pagina e o proprio produto: em vez de descrever o que sai, a
 * faixa abaixo do titulo mostra criativos reais, gerados pelo Postei, dos
 * tres nichos. Por isso a esteira vem antes de qualquer explicacao.
 */
export function Heroi() {
  // Rodizio entre os nichos: os arquivos vem agrupados por ramo (todos os de
  // receitas, depois financas...), e exibir nessa ordem faria a faixa parecer
  // que o produto so atende um ramo por vez.
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
            className="rounded-full bg-tinta px-6 py-3.5 font-medium text-papel transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
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

        <div className="mt-10 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="rotulo mr-1">Já disponível para</span>
          {nichos.map((n) => (
            <span
              key={n.id}
              className="rounded-full border border-tinta/12 bg-branco px-3 py-1 text-sm text-cinza"
            >
              {n.nome}
            </span>
          ))}
        </div>
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

