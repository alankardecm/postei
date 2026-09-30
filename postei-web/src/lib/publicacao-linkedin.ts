import { motor } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarUrlPublica } from "@/lib/imagem-publica";
import { publicarImagens, renovarToken } from "@/lib/linkedin";

type Post = {
  imagem: string;
  imagens: string[] | null;
  imagemLinkedin?: string | null;
  imagensLinkedin?: string[] | null;
  formato: string;
  legenda: string;
  legendaLinkedin?: string | null;
  textoParaColarLinkedin?: string | null;
  cta: string | null;
  hashtags: string[];
  fonte: { titulo: string; revista: string; ano: string; url: string } | null;
};

export class ErroPublicacaoLi extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

export function montarLegendaLinkedin(post: Post) {
  if (post.textoParaColarLinkedin?.trim()) return post.textoParaColarLinkedin.trim();
  const tags = post.hashtags.slice(0, 5).map((h) => `#${h}`).join(" ");
  return [
    post.legendaLinkedin || post.legenda,
    post.cta,
    post.fonte &&
      `Fonte: ${post.fonte.titulo} (${post.fonte.revista}, ${post.fonte.ano}) — ${post.fonte.url}`,
    tags,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function registroAtivoLinkedin(
  usuarioId: string,
  loteId: string,
  indice: number,
) {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("publicacoes_linkedin")
    .select("id, situacao, li_post_urn")
    .eq("usuario_id", usuarioId)
    .eq("lote_id", loteId)
    .eq("indice", indice)
    .in("situacao", ["publicada", "publicando", "agendada"])
    .order("atualizado_em", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export async function contaLinkedin(usuarioId: string) {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("contas_linkedin")
    .select("id, person_urn, nome, token, refresh_token, expira_em")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data;
}

async function tokenValido(conta: NonNullable<Awaited<ReturnType<typeof contaLinkedin>>>) {
  const admin = criarClienteAdmin();
  const venceEm = new Date(conta.expira_em).getTime();
  if (venceEm - Date.now() > 24 * 60 * 60 * 1000) return conta.token;

  if (!conta.refresh_token) {
    throw new ErroPublicacaoLi("A conexão com o LinkedIn expirou. Conecte novamente.");
  }

  const novo = await renovarToken(conta.refresh_token);
  const expira = new Date(Date.now() + novo.expires_in * 1000).toISOString();
  await admin
    .from("contas_linkedin")
    .update({
      token: novo.access_token,
      refresh_token: novo.refresh_token || conta.refresh_token,
      expira_em: expira,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", conta.id);
  return novo.access_token;
}

export async function publicarLinkedinAgora({
  usuarioId,
  loteId,
  indice,
  registroId,
  base,
}: {
  usuarioId: string;
  loteId: string;
  indice: number;
  registroId: string;
  base: string;
}) {
  const admin = criarClienteAdmin();
  const marcar = (campos: Record<string, unknown>) =>
    admin
      .from("publicacoes_linkedin")
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq("id", registroId);

  try {
    const conta = await contaLinkedin(usuarioId);
    if (!conta) throw new ErroPublicacaoLi("Nenhuma conta do LinkedIn conectada.");

    const token = await tokenValido(conta);
    const pacote = (await motor.lote(usuarioId, loteId)) as { posts?: Post[] };
    const post = pacote.posts?.[indice];
    if (!post) throw new ErroPublicacaoLi("Post não encontrado.", 404);

    const arquivos =
      post.imagensLinkedin?.length
        ? post.imagensLinkedin
        : post.imagemLinkedin
          ? [post.imagemLinkedin]
          : post.formato === "carrossel" && post.imagens?.length
            ? post.imagens
            : [post.imagem];

    const imagens: Buffer[] = [];
    for (const arquivo of arquivos) {
      const url = gerarUrlPublica({
        base,
        assinanteId: usuarioId,
        loteId,
        arquivo,
      });
      const res = await fetch(url);
      if (!res.ok) throw new ErroPublicacaoLi(`Não consegui ler a arte (${arquivo}).`);
      imagens.push(Buffer.from(await res.arrayBuffer()));
    }

    const { postUrn } = await publicarImagens({
      token,
      personUrn: conta.person_urn,
      imagens,
      legenda: montarLegendaLinkedin(post),
    });

    await marcar({ situacao: "publicada", li_post_urn: postUrn, erro: null });
    return { postUrn };
  } catch (erro) {
    await marcar({ situacao: "falhou", erro: (erro as Error).message });
    throw erro;
  }
}
