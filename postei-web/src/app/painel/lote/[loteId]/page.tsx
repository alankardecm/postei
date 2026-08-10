import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Cabecalho } from "@/components/site/Cabecalho";
import { SlidesCarrossel } from "@/components/painel/SlidesCarrossel";
import { EditarPost } from "@/components/painel/EditarPost";
import { motor, usuarioAtual, ErroMotor } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { assinaturaDe } from "@/lib/cota";
import { PLANOS } from "@/lib/planos";

export const metadata = { title: "Pacote — Postei" };
export const dynamic = "force-dynamic";

type Post = {
  formato: string;
  fonte: { titulo: string; revista: string; ano: string; url: string } | null;
  imagens: string[] | null;
  titulo: string;
  subtitulo: string | null;
  legenda: string;
  cta: string | null;
  hashtags: string[];
  imagem: string;
};

type Pacote = {
  loteId: string;
  marca: string;
  nicho: { nome: string };
  geradoEm: string;
  posts: Post[];
};

export default async function Lote({ params }: PageProps<"/painel/lote/[loteId]">) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar?de=/painel");

  const { loteId } = await params;

  let pacote: Pacote;
  try {
    pacote = (await motor.lote(user.id, loteId)) as unknown as Pacote;
  } catch (erro) {
    if ((erro as ErroMotor).status === 404) notFound();
    throw erro;
  }

  const assinatura = await assinaturaDe(user.id);

  const admin = criarClienteAdmin();
  const { data: conta } = await admin
    .from("contas_instagram")
    .select("username")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (
    <>
      <Cabecalho />
      <main className="flex-1 px-5 py-14">
        <div className="mx-auto max-w-3xl">
          <Link href="/painel" className="rotulo transition-colors hover:text-tinta">
            ← Voltar ao painel
          </Link>

          <h1 className="fonte-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {pacote.nicho.nome}
          </h1>
          <p className="mt-2 text-cinza">
            {pacote.marca} · {pacote.posts.length} posts ·{" "}
            {new Date(pacote.geradoEm).toLocaleDateString("pt-BR")}
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {pacote.posts.map((post, i) => (
              <li
                key={post.imagem}
                className="grid gap-5 rounded-2xl border border-linha bg-branco p-5 sm:grid-cols-[190px_1fr]"
              >
                <div className="flex flex-col gap-2">
                  <Image
                    src={`/api/lotes/${encodeURIComponent(loteId)}/imagem/${encodeURIComponent(post.imagem)}`}
                    alt={post.titulo}
                    width={1080}
                    height={1350}
                    className="h-auto w-full rounded-lg border border-linha"
                    unoptimized
                  />
                  {post.imagens && post.imagens.length > 1 && (
                    <span className="rotulo text-center">
                      capa · {post.imagens.length} slides abaixo
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rotulo tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[.68rem] uppercase tracking-wider ${
                        post.formato === "carrossel"
                          ? "bg-limao text-tinta"
                          : "border border-linha text-cinza"
                      }`}
                    >
                      {post.formato}
                      {post.imagens && post.imagens.length > 1 && ` · ${post.imagens.length}`}
                    </span>
                  </div>

                  <h2 className="fonte-display text-lg font-bold leading-snug tracking-tight">
                    {post.titulo}
                  </h2>

                  <p className="text-sm leading-relaxed text-cinza">{post.legenda}</p>
                  {post.cta && <p className="text-sm font-medium text-folha">{post.cta}</p>}

                  {post.fonte && (
                    <a
                      href={post.fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-linha bg-papel px-3 py-2 text-xs leading-snug text-cinza transition-colors hover:border-folha"
                    >
                      <span className="rotulo">Fonte</span>{" "}
                      {post.fonte.titulo} ({post.fonte.revista}, {post.fonte.ano}) ↗
                    </a>
                  )}

                  <p className="font-mono text-xs leading-relaxed text-cinza">
                    {post.hashtags.map((h) => `#${h}`).join(" ")}
                  </p>

                  <div className="mt-1">
                    <EditarPost
                      loteId={loteId}
                      indice={i}
                      conectado={Boolean(conta)}
                      podeEditar={PLANOS[assinatura.plano].podeEditar}
                      legenda={post.legenda}
                      cta={post.cta}
                      hashtags={post.hashtags}
                    />
                  </div>
                </div>

                {/* Os slides do carrossel, na largura toda do cartão.
                    Antes eram miniaturas de 48px na coluna lateral: existiam
                    tecnicamente e ninguém conseguia ler nada -- e o assinante
                    acabava aprovando um carrossel tendo visto só a capa. */}
                {post.imagens && post.imagens.length > 1 && (
                  <div className="sm:col-span-2">
                    <SlidesCarrossel loteId={loteId} arquivos={post.imagens} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
