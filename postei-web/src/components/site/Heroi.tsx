"use client";

import Link from "next/link";
import { Esteira } from "@/components/site/Esteira";
import { CartaoIg } from "@/components/site/CartaoIg";
import { criativos, type Criativo } from "@/lib/conteudo";

const WHATS =
  "https://wa.me/5519995483158?text=Oi%2C%20vim%20pelo%20Postei.%20Quero%20entender%20como%20funciona.";

export function Heroi() {
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
    <section className="relative overflow-hidden pt-10 pb-8 sm:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-linha bg-branco px-3 py-1 text-xs font-semibold tracking-wide text-cinza">
            <span className="h-1.5 w-1.5 rounded-full bg-limao" aria-hidden="true" />
            Instagram e LinkedIn · sem design · sem cartão
          </p>

          <h1 className="fonte-display max-w-xl text-[clamp(2.4rem,6vw,4.2rem)] font-extrabold leading-[0.98] tracking-[-.035em] text-balance">
            Seu mês no Instagram, <em className="not-italic text-folha">pronto.</em>
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-cinza sm:text-xl">
            30 posts com imagem e legenda. Você escolhe Instagram, LinkedIn
            ou os dois — revisa e publica, sem tela em branco e sem Canva.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/criar-conta"
              className="rounded-full bg-limao px-7 py-3.5 text-base font-semibold text-ink shadow-[0_8px_24px_rgba(159,232,112,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              Começar grátis
            </Link>
            <a
              href={WHATS}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-tinta/15 px-6 py-3.5 font-medium transition-colors hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              Falar no WhatsApp
            </a>
          </div>

          <p className="mt-4 text-sm text-cinza">
            Sem cartão. 2 posts de teste. Cancela quando quiser.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cinza">
            <li>Publica no Instagram</li>
            <li>Tom do seu ramo</li>
            <li>Produto da AM Consultoria</li>
          </ul>
        </div>

        <div className="hero-monte" aria-hidden="true">
          <CartaoIg
            arquivo="05-financas-pessoais.jpg"
            titulo="Cheque especial"
            marca="financaspratica"
            className="hero-monte-a"
          />
          <CartaoIg
            arquivo="01-receitas.jpg"
            titulo="Macarrão alho e óleo"
            marca="cozinhaminha"
            className="hero-monte-b"
          />
          <CartaoIg
            arquivo="09-nutricao-estudante.jpg"
            titulo="Pós-treino"
            marca="nutrinaula"
            className="hero-monte-c"
          />
        </div>
      </div>

      <p className="mx-auto mt-14 max-w-6xl px-5 text-xs font-semibold uppercase tracking-[0.14em] text-cinza">
        Posts reais gerados pelo Postei
      </p>
      <div className="mt-4 flex flex-col gap-3" aria-label="Exemplos de posts gerados pelo Postei">
        <Esteira itens={faixaA} sentido="esquerda" duracao={110} />
        <Esteira itens={faixaB} sentido="direita" duracao={125} />
      </div>
    </section>
  );
}
