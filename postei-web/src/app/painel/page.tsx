import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/site/Cabecalho";
import { Gerador } from "@/components/painel/Gerador";
import { motor, usuarioAtual, type Lote, type Nicho } from "@/lib/motor";
import { Captacao, type LinkResumo } from "@/components/painel/Captacao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Instagram, type ContaIg } from "@/components/painel/Instagram";
import { Agendados, type Agendado } from "@/components/painel/Agendados";

export const metadata = { title: "Painel — Postei" };
export const dynamic = "force-dynamic";

export default async function Painel({ searchParams }: PageProps<"/painel">) {
  const user = await usuarioAtual();
  // O proxy.ts ja barra quem nao entrou; esta e a segunda tranca.
  if (!user) redirect("/entrar?de=/painel");

  // O painel nao pode cair so porque o motor esta fora do ar: mostra o que
  // deu e segue funcionando no resto.
  let nichos: Nicho[] = [];
  let lotes: Lote[] = [];
  let falha: string | null = null;

  try {
    [nichos, lotes] = await Promise.all([motor.nichos(user.id), motor.lotes(user.id)]);
  } catch (erro) {
    falha = (erro as Error).message;
  }

  // Links de captacao com a contagem de cliques e contatos. Uso o cliente
  // administrativo e filtro pelo usuario da sessao -- o mesmo resultado que
  // a RLS daria, sem depender de repassar o token do usuario ate aqui.
  const admin = criarClienteAdmin();
  const { data: brutos } = await admin
    .from("links")
    .select("id, codigo, titulo, destino, cliques(count), contatos(count)")
    .eq("usuario_id", user.id)
    .order("criado_em", { ascending: false });

  const links: LinkResumo[] = (brutos ?? []).map((l) => ({
    id: l.id as string,
    codigo: l.codigo as string,
    titulo: l.titulo as string,
    destino: l.destino as string | null,
    cliques: (l.cliques as { count: number }[])?.[0]?.count ?? 0,
    contatos: (l.contatos as { count: number }[])?.[0]?.count ?? 0,
  }));

  // O token NUNCA entra neste select: ele existe só para o servidor usar.
  const { data: conta } = await admin
    .from("contas_instagram")
    .select("username, expira_em")
    .eq("usuario_id", user.id)
    .maybeSingle();

  // Fila: o que está esperando o horário, mais as falhas recentes — sem
  // mostrar a falha, o assinante acha que publicou.
  const { data: fila } = await admin
    .from("publicacoes")
    .select("id, lote_id, indice, agendada_para, situacao, erro")
    .eq("usuario_id", user.id)
    .in("situacao", ["agendada", "publicando", "falhou"])
    .order("agendada_para", { ascending: true })
    .limit(20);

  const { ig } = await searchParams;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <>
      <Cabecalho />
      <main className="flex-1 px-5 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rotulo mb-2">Painel</p>
              <h1 className="fonte-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Seus pacotes
              </h1>
              <p className="mt-2 text-sm text-cinza">{user.email}</p>
            </div>
            <form action="/sair" method="post">
              <button
                type="submit"
                className="rounded-full border border-tinta/20 px-4 py-2 text-sm transition-colors hover:border-tinta/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
              >
                Sair
              </button>
            </form>
          </div>

          {falha ? (
            <p className="mt-10 rounded-2xl border border-linha bg-branco p-6 text-cinza">
              Não consegui falar com o motor de geração: {falha}
            </p>
          ) : (
            <div className="mt-10">
              <Gerador nichos={nichos} />
            </div>
          )}

          <section className="mt-12">
            <h2 className="rotulo mb-4">
              Histórico {lotes.length > 0 && `· ${lotes.length}`}
            </h2>

            {lotes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-linha p-8 text-center text-cinza">
                Nenhum pacote ainda. Gere o primeiro aí em cima.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {lotes.map((lote) => (
                  <li key={lote.loteId}>
                    <Link
                      href={`/painel/lote/${encodeURIComponent(lote.loteId)}`}
                      className="flex gap-4 overflow-hidden rounded-2xl border border-linha bg-branco p-4 transition-colors hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
                    >
                    {lote.capa && (
                      <Image
                        src={`/api/lotes/${encodeURIComponent(lote.loteId)}/imagem/${encodeURIComponent(lote.capa)}`}
                        alt=""
                        width={1080}
                        height={1350}
                        className="h-28 w-[90px] shrink-0 rounded-lg border border-linha object-cover"
                        unoptimized
                      />
                    )}
                    <div className="min-w-0">
                      <p className="fonte-display font-bold tracking-tight">{lote.nicho.nome}</p>
                      <p className="truncate text-sm text-cinza">{lote.marca}</p>
                      <p className="mt-2 text-sm tabular-nums text-cinza">
                        {lote.posts} posts ·{" "}
                        {new Date(lote.geradoEm).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                      {lote.parcial && (
                        <p className="mt-1.5 inline-block rounded-full bg-areia px-2 py-0.5 text-xs text-tinta">
                          pacote parcial
                        </p>
                      )}
                    </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Agendados itens={(fila ?? []) as Agendado[]} />

          <Instagram conta={conta as ContaIg} aviso={typeof ig === "string" ? ig : undefined} />

          <Captacao links={links} base={base} />
        </div>
      </main>
    </>
  );
}
