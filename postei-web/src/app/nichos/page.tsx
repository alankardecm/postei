import type { Metadata } from "next";
import Link from "next/link";
import { Venda } from "@/components/site/Venda";
import { Rodape } from "@/components/site/Secoes";
import { CartaoIg } from "@/components/site/CartaoIg";
import { criativos, nichos } from "@/lib/conteudo";

export const metadata: Metadata = {
  title: "Posts prontos por ramo",
  description:
    "Veja posts gerados pelo Postei para receitas, finanças pessoais e nutrição. O mesmo sistema, a voz do seu negócio.",
  alternates: { canonical: "/nichos" },
};

export default function NichosIndex() {
  return (
    <Venda>
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="rotulo mb-4">Ramos</p>
          <h1 className="fonte-display max-w-2xl text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-.03em]">
            Posts prontos no tom do seu negócio.
          </h1>
          <p className="mt-4 max-w-xl text-cinza">
            Cada ramo tem assunto, tom e o que nunca pode ser dito. Escolhe o seu e vê o que sai.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {nichos.map((n) => {
              const exemplo =
                criativos.find((c) => c.nichoId === n.id && c.comFoto) ??
                criativos.find((c) => c.nichoId === n.id);
              return (
                <Link key={n.id} href={`/nichos/${n.id}`} className="group">
                  {exemplo ? (
                    <CartaoIg
                      arquivo={exemplo.arquivo}
                      titulo={exemplo.titulo}
                      marca={n.id.replace(/-/g, "")}
                    />
                  ) : null}
                  <h2 className="fonte-display mt-4 text-lg font-bold tracking-tight group-hover:text-folha">{n.nome}</h2>
                  <p className="mt-1 text-sm text-cinza">{n.publico}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Rodape />
    </Venda>
  );
}
