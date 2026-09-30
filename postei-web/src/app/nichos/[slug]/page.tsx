import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Venda } from "@/components/site/Venda";
import { ChamadaFinal, Rodape } from "@/components/site/Secoes";
import { CartaoIg } from "@/components/site/CartaoIg";
import { criativos, nichos } from "@/lib/conteudo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return nichos.map((n) => ({ slug: n.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nicho = nichos.find((n) => n.id === slug);
  if (!nicho) return { title: "Ramo" };
  return {
    title: `Posts prontos para Instagram | ${nicho.nome}`,
    description: `30 posts no tom de ${nicho.nome.toLowerCase()}. ${nicho.publico}. Sem Canva, sem cartão para testar.`,
    alternates: { canonical: `/nichos/${nicho.id}` },
  };
}

export default async function PaginaNicho({ params }: Props) {
  const { slug } = await params;
  const nicho = nichos.find((n) => n.id === slug);
  if (!nicho) notFound();

  const posts = criativos.filter((c) => c.nichoId === nicho.id).slice(0, 6);
  const marca = nicho.id.replace(/-/g, "");

  return (
    <Venda>
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="rotulo mb-4">
            <Link href="/nichos" className="hover:text-tinta">
              Ramos
            </Link>{" "}
            / {nicho.nome}
          </p>
          <h1 className="fonte-display max-w-3xl text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-.03em]">
            {nicho.nome}: o mês de posts, pronto.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-cinza">{nicho.publico}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/#demo" className="rounded-full bg-limao px-6 py-3 font-semibold text-ink">
              Ver 3 posts agora
            </Link>
            <Link href="/criar-conta" className="rounded-full border border-linha px-6 py-3 font-medium">
              Começar grátis
            </Link>
          </div>
        </section>
        <section className="border-t border-linha bg-branco py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <CartaoIg key={p.arquivo} arquivo={p.arquivo} titulo={p.titulo} marca={marca} />
            ))}
          </div>
        </section>
        <ChamadaFinal />
      </main>
      <Rodape />
    </Venda>
  );
}
