import { notFound, redirect } from "next/navigation";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { FormularioContato } from "@/components/captacao/FormularioContato";

export const dynamic = "force-dynamic";

/**
 * Pagina publica do link de captacao.
 *
 * Registra o clique e, conforme o link, ou leva direto ao destino ou mostra
 * o formulario de contato. Nao exige login: quem chega aqui e o seguidor do
 * assinante, nao o assinante.
 */
export default async function Link({ params }: PageProps<"/l/[codigo]">) {
  const { codigo } = await params;
  const supabase = criarClienteAdmin();

  const { data: link } = await supabase
    .from("links")
    .select("id, titulo, destino, captura")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!link) notFound();

  // O clique conta mesmo que o visitante desista do formulario: ele mede
  // alcance, e o contato mede conversao. Sao numeros diferentes.
  await supabase.from("cliques").insert({ link_id: link.id, origem: "web" });

  if (!link.captura && link.destino) redirect(link.destino);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full bg-limao" aria-hidden="true" />
          <span className="fonte-display font-bold">{link.titulo}</span>
        </div>

        <h1 className="fonte-display text-3xl font-extrabold leading-tight tracking-tight text-balance">
          Deixe seu contato
        </h1>
        <p className="mt-2 mb-8 text-cinza">
          A gente responde por aqui mesmo. Sem cadastro e sem senha.
        </p>

        <FormularioContato codigo={codigo} destino={link.destino} />
      </div>
    </main>
  );
}
