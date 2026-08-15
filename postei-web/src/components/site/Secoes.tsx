"use client";

import Link from "next/link";
import AnimatedContent from "@/components/AnimatedContent";
import SpotlightCard from "@/components/SpotlightCard";
import { CartaoIg } from "@/components/site/CartaoIg";
import { criativos, nichos, passos, planos, perguntas } from "@/lib/conteudo";

const WHATS =
  "https://wa.me/5519995483158?text=Oi%2C%20vim%20pelo%20Postei.%20Quero%20entender%20como%20funciona.";

const dores = [
  {
    t: "Tela em branco",
    d: "Toda semana a mesma coisa: sentar para postar e não sair nada. O feed some.",
  },
  {
    t: "Someu do Instagram",
    d: "Quem não aparece some da cabeça do cliente. Constância vende mais do que post bonito isolado.",
  },
  {
    t: "Canva até tarde",
    d: "Ou você paga designer, ou gasta a noite montando post. Os dois custam o tempo que deveria ir para o negócio.",
  },
];

export function Problema() {
  return (
    <section id="problema" className="border-t border-linha bg-branco py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">O problema</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-.025em] text-balance">
          Não é falta de ideia. É falta de um mês pronto.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {dores.map((item) => (
            <article key={item.t} className="rounded-2xl border border-linha bg-papel p-6">
              <h3 className="fonte-display text-xl font-bold tracking-tight">{item.t}</h3>
              <p className="mt-2 leading-relaxed text-cinza">{item.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Nichos() {
  const exemplos = nichos.filter((n) => criativos.some((c) => c.nichoId === n.id));

  return (
    <section id="nichos" className="border-t border-linha py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Veja o que sai</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-.025em] text-balance">
          O mesmo sistema. A voz do seu negócio.
        </h2>
        <p className="mt-4 max-w-xl text-cinza">
          Cada ramo tem assunto, tom e o que nunca pode ser dito. Não é só trocar a cor do post.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {exemplos.map((n, i) => {
            const exemplo =
              criativos.find((c) => c.nichoId === n.id && c.comFoto) ??
              criativos.find((c) => c.nichoId === n.id);
            return (
              <AnimatedContent key={n.id} distance={28} duration={0.55} delay={i * 0.06} threshold={0.15}>
                <article>
                  {exemplo && (
                    <CartaoIg
                      arquivo={exemplo.arquivo}
                      titulo={exemplo.titulo}
                      marca={n.id.replace(/-/g, "")}
                    />
                  )}
                  <h3 className="fonte-display mt-4 text-lg font-bold tracking-tight">{n.nome}</h3>
                  <p className="mt-1 text-sm text-cinza">{n.publico}</p>
                </article>
              </AnimatedContent>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-cinza">
          Seu ramo não está aqui?{" "}
          <a href={WHATS} target="_blank" rel="noopener" className="font-semibold text-folha underline underline-offset-4">
            Chama no WhatsApp
          </a>{" "}
          — incluímos sob medida.
        </p>
      </div>
    </section>
  );
}

export function ComoFunciona() {
  return (
    <section id="como" className="border-t border-linha bg-branco py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Como funciona</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-.025em] text-balance">
          Três passos. O último é o único seu.
        </h2>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {passos.map((p, i) => (
            <li key={p.titulo} className="rounded-2xl border border-linha bg-papel p-7">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-limao text-sm font-bold text-ink">
                {i + 1}
              </span>
              <h3 className="fonte-display mt-4 text-xl font-bold tracking-tight">{p.titulo}</h3>
              <p className="mt-2.5 leading-relaxed text-cinza">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Planos() {
  return (
    <section id="planos" className="border-t border-linha bg-branco py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Preços</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-.025em] text-balance">
          Menos que um post de freelancer. Todo mês.
        </h2>
        <p className="mt-4 max-w-xl text-cinza">
          Você começa no teste, sem cartão. Só assina se quiser o mês inteiro.
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {planos.map((plano) => (
            <SpotlightCard
              key={plano.nome}
              spotlightColor="rgba(159, 232, 112, 0.22)"
              className={`flex flex-col rounded-2xl border p-7 ${
                plano.destaque
                  ? "border-folha/40 bg-papel ring-2 ring-limao"
                  : "border-linha bg-papel"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="fonte-display text-lg font-bold tracking-tight">{plano.nome}</h3>
                {plano.destaque && (
                  <span className="rounded-full bg-limao px-2.5 py-1 text-[.68rem] font-bold uppercase tracking-wider text-ink">
                    Recomendado
                  </span>
                )}
              </div>

              <p className="mt-5 fonte-display text-4xl font-extrabold tracking-tight tabular-nums">
                <span className="align-top text-lg font-semibold">R$ </span>
                {plano.preco}
                <span className="text-base font-normal text-cinza">/mês</span>
              </p>

              <p className="mt-3 text-sm leading-relaxed text-cinza">{plano.resumo}</p>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
                {plano.itens.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-folha" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/criar-conta"
                className={`mt-7 rounded-full px-5 py-3.5 text-center font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha ${
                  plano.destaque ? "bg-limao text-ink" : "border border-linha bg-branco text-tinta hover:border-folha/50"
                }`}
              >
                Começar grátis
              </Link>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Perguntas() {
  return (
    <section id="perguntas" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <p className="rotulo mb-4">Dúvidas</p>
        <h2 className="fonte-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-.025em] text-balance">
          O que trava a decisão.
        </h2>

        <div className="mt-10 divide-y divide-linha border-y border-linha">
          {perguntas.map((q) => (
            <details key={q.p} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha">
                {q.p}
                <span className="text-2xl leading-none text-cinza transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-cinza">{q.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChamadaFinal() {
  return (
    <section className="px-5 pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink px-7 py-16 text-[#F2F4EE] sm:px-14">
        <p className="rotulo mb-4 !text-[#9B9B93]">Começa hoje</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(2rem,4.5vw,3.3rem)] font-extrabold leading-[1.02] tracking-[-.03em] text-balance text-white">
          Semana que vem seu feed já pode estar no ar.
        </h2>
        <p className="mt-5 max-w-lg text-lg text-white/70">
          Cria a conta, gera o teste, publica. Sem cartão e sem compromisso.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/criar-conta"
            className="inline-block rounded-full bg-limao px-7 py-3.5 font-semibold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-limao"
          >
            Começar grátis
          </Link>
          <a
            href={WHATS}
            target="_blank"
            rel="noopener"
            className="inline-block rounded-full border border-white/20 px-7 py-3.5 font-medium text-white transition-colors hover:border-white/50"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-linha py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 text-sm text-cinza sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1.5 rounded-full bg-limao" aria-hidden="true" />
            <span className="fonte-display font-bold text-tinta">Postei</span>
          </div>
          <p className="mt-2 max-w-xs leading-relaxed">
            Um produto da{" "}
            <a href="https://amconsultoria.tech" className="font-medium text-tinta underline underline-offset-4 hover:text-folha">
              AM Consultoria
            </a>
            .
          </p>
          <p className="mt-1">CNPJ 43.947.919/0001-08</p>
        </div>
        <nav className="flex flex-col gap-2 sm:items-end">
          <a href="mailto:comercial@amconsultoria.tech" className="transition-colors hover:text-tinta">
            comercial@amconsultoria.tech
          </a>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
            <Link href="/privacidade" className="transition-colors hover:text-tinta">
              Privacidade
            </Link>
            <Link href="/termos" className="transition-colors hover:text-tinta">
              Termos
            </Link>
            <Link href="/exclusao-de-dados" className="transition-colors hover:text-tinta">
              Excluir dados
            </Link>
          </div>
          <p className="max-w-sm sm:text-right">Fotos por Pexels. Conteúdo gerado com IA e revisado por você.</p>
        </nav>
      </div>
    </footer>
  );
}
