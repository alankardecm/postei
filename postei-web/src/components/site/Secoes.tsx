"use client";

import Link from "next/link";
import Image from "next/image";
import AnimatedContent from "@/components/AnimatedContent";
import SpotlightCard from "@/components/SpotlightCard";
import CountUp from "@/components/CountUp";
import { criativos, nichos, passos, planos, perguntas } from "@/lib/conteudo";

/** Prova de que o produto e multi-nicho: um exemplo real de cada ramo. */
export function Nichos() {
  return (
    <section id="nichos" className="border-t border-linha bg-branco py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Um tom para cada ramo</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.06] tracking-[-.025em] text-balance">
          O mesmo sistema, com a voz do seu negócio.
        </h2>
        <p className="mt-5 max-w-xl text-cinza">
          Cada ramo tem seu público, seu vocabulário e suas regras. O Postei não troca só a
          cor: muda o jeito de falar, os assuntos e o que nunca pode ser dito.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {nichos.map((n, i) => {
            const exemplo = criativos.find((c) => c.nichoId === n.id && c.comFoto)
              ?? criativos.find((c) => c.nichoId === n.id);
            return (
              <AnimatedContent key={n.id} distance={40} duration={0.7} delay={i * 0.08} threshold={0.15}>
                <article className="overflow-hidden rounded-2xl border border-linha bg-papel">
                  {exemplo && (
                    <Image
                      src={`/mostra/${exemplo.arquivo}`}
                      alt={`Exemplo de post do nicho ${n.nome}: ${exemplo.titulo}`}
                      width={1080}
                      height={1350}
                      className="block h-auto w-full"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  )}
                  <div className="flex items-start gap-3 p-5">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: n.cor }}
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="fonte-display font-bold tracking-tight">{n.nome}</h3>
                      <p className="mt-1 text-sm leading-snug text-cinza">{n.publico}</p>
                    </div>
                  </div>
                </article>
              </AnimatedContent>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-cinza">
          Seu ramo não está aqui?{" "}
          <a href="#perguntas" className="text-folha underline underline-offset-4">
            Adicionar um nicho leva um dia, não um mês.
          </a>
        </p>
      </div>
    </section>
  );
}

/** Sequencia real de tres etapas -- por isso a numeracao existe. */
export function ComoFunciona() {
  return (
    <section id="como" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Como funciona</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.06] tracking-[-.025em] text-balance">
          Três passos. O terceiro é o único seu.
        </h2>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-linha bg-linha md:grid-cols-3">
          {passos.map((p, i) => (
            <li key={p.titulo} className="bg-papel p-7">
              <span className="rotulo tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="fonte-display mt-3 text-xl font-bold tracking-tight">{p.titulo}</h3>
              <p className="mt-2.5 leading-relaxed text-cinza">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Numeros() {
  return (
    <section className="bg-tinta py-16 text-papel sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:grid-cols-3">
        <Numero valor={30} sufixo=" posts" texto="entregues de uma vez, no plano de entrada." />
        <Numero valor={3} sufixo=" nichos" texto="prontos hoje, com tom e regras próprios." />
        <Numero valor={10} sufixo=" min" texto="é o tempo que sobra pra você: revisar e publicar." />
      </div>
    </section>
  );
}

function Numero({ valor, sufixo, texto }: { valor: number; sufixo: string; texto: string }) {
  return (
    <div>
      <p className="fonte-display text-5xl font-extrabold tracking-tight tabular-nums sm:text-6xl">
        <CountUp to={valor} duration={1.4} className="text-limao" />
        <span className="text-limao">{sufixo}</span>
      </p>
      <p className="mt-2 max-w-xs leading-relaxed text-papel/65">{texto}</p>
    </div>
  );
}

export function Planos() {
  return (
    <section id="planos" className="border-t border-linha bg-branco py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <p className="rotulo mb-4">Planos</p>
        <h2 className="fonte-display max-w-2xl text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.06] tracking-[-.025em] text-balance">
          Você paga pelo volume, não pelo tamanho da empresa.
        </h2>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {planos.map((plano) => (
            <SpotlightCard
              key={plano.nome}
              spotlightColor="rgba(159, 232, 112, 0.30)"
              className={`flex flex-col rounded-2xl border p-7 ${
                plano.destaque
                  ? "border-tinta bg-tinta text-papel"
                  : "border-linha bg-papel text-tinta"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="fonte-display text-lg font-bold tracking-tight">{plano.nome}</h3>
                {plano.destaque && (
                  <span className="rounded-full bg-limao px-2.5 py-1 text-[.68rem] font-semibold uppercase tracking-wider text-tinta">
                    Recomendado
                  </span>
                )}
              </div>

              <p className={`mt-5 fonte-display text-4xl font-extrabold tracking-tight tabular-nums`}>
                <span className="align-top text-lg font-semibold">R$ </span>
                {plano.preco}
                <span className={`text-base font-normal ${plano.destaque ? "text-papel/55" : "text-cinza"}`}>
                  /mês
                </span>
              </p>

              <p className={`mt-3 text-sm leading-relaxed ${plano.destaque ? "text-papel/70" : "text-cinza"}`}>
                {plano.resumo}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
                {plano.itens.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span
                      className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                        plano.destaque ? "bg-limao" : "bg-folha"
                      }`}
                      aria-hidden="true"
                    />
                    <span className={plano.destaque ? "text-papel/85" : ""}>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/criar-conta"
                className={`mt-7 rounded-full px-5 py-3 text-center font-medium transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha ${
                  plano.destaque ? "bg-limao text-tinta" : "bg-tinta text-papel"
                }`}
              >
                Começar
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
    <section id="perguntas" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <p className="rotulo mb-4">Dúvidas</p>
        <h2 className="fonte-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.06] tracking-[-.025em] text-balance">
          O que costumam perguntar.
        </h2>

        <div className="mt-10 divide-y divide-linha border-y border-linha">
          {perguntas.map((q) => (
            <details key={q.p} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha">
                {q.p}
                <span
                  className="text-2xl leading-none text-cinza transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
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
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-limao px-7 py-16 text-tinta sm:px-14">
        <h2 className="fonte-display max-w-2xl text-[clamp(2rem,4.5vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-.03em] text-balance">
          Semana que vem seu feed já pode estar pronto.
        </h2>
        <p className="mt-5 max-w-lg text-lg text-tinta/75">
          Crie sua conta e gere o primeiro pacote. Sem cartão e sem compromisso.
        </p>
        <Link
          href="/criar-conta"
          className="mt-9 inline-block rounded-full bg-tinta px-7 py-3.5 font-medium text-papel transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
        >
          Criar minha conta
        </Link>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-linha py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 text-sm text-cinza sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-1.5 rounded-full bg-limao" aria-hidden="true" />
          <span className="fonte-display font-bold text-tinta">Postei</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacidade" className="transition-colors hover:text-tinta">
            Privacidade
          </Link>
          <Link href="/termos" className="transition-colors hover:text-tinta">
            Termos de uso
          </Link>
          <Link href="/exclusao-de-dados" className="transition-colors hover:text-tinta">
            Excluir meus dados
          </Link>
        </nav>
        <p className="max-w-md">
          Fotos por Pexels. Conteúdo gerado com IA e revisado por você.
        </p>
      </div>
    </footer>
  );
}
