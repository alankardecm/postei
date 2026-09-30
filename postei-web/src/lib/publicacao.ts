import { motor } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarUrlPublica } from "@/lib/imagem-publica";
import { publicarImagem, publicarCarrossel, publicarReels } from "@/lib/instagram";
import { MENCAO_INSTAGRAM_MARCA, deveMencionarMarca, jaMencionaMarca } from "@/lib/planos";

/**
 * Publicação de um post no Instagram.
 *
 * Vive aqui, e não dentro de uma rota, porque DOIS caminhos precisam dela:
 * o botão do painel e o agendador. Duplicar essa lógica é o tipo de dívida
 * que se paga quando um lado é corrigido e o outro segue errado por meses.
 */

export type ModoPublicacao = "feed" | "reels";

type Post = {
  imagem: string;
  imagens: string[] | null;
  video?: string | null;
  formato: string;
  legenda: string;
  cta: string | null;
  hashtags: string[];
  fonte: { titulo: string; revista: string; ano: string; url: string } | null;
};

export class ErroPublicacao extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

/** Monta a legenda final. A fonte vai antes das hashtags: depois ninguém lê. */
export function montarLegenda(post: Post, opts?: { mencionarMarca?: boolean }) {
  const jaTem = jaMencionaMarca([post.legenda, post.cta ?? ""].join("\n"));
  return [
    post.legenda,
    post.cta,
    opts?.mencionarMarca && !jaTem ? MENCAO_INSTAGRAM_MARCA : null,
    post.fonte &&
      `Fonte: ${post.fonte.titulo} (${post.fonte.revista}, ${post.fonte.ano}) — ${post.fonte.url}`,
    post.hashtags.map((h) => `#${h}`).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function registroAtivoInstagram(
  usuarioId: string,
  loteId: string,
  indice: number,
) {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("publicacoes")
    .select("id, situacao, ig_media_id")
    .eq("usuario_id", usuarioId)
    .eq("lote_id", loteId)
    .eq("indice", indice)
    .in("situacao", ["publicada", "publicando", "agendada"])
    .order("atualizado_em", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export async function contaConectada(usuarioId: string) {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("contas_instagram")
    .select("id, ig_user_id, token, expira_em, username")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data;
}

/**
 * Publica de fato. Já espera receber o registro em `publicacoes` criado,
 * para que uma falha fique gravada e visível em vez de sumir.
 */
export async function publicarAgora({
  usuarioId,
  loteId,
  indice,
  registroId,
  base,
  modo = "feed",
}: {
  usuarioId: string;
  loteId: string;
  indice: number;
  registroId: string;
  base: string;
  /** feed = imagem/carrossel (padrão); reels = MP4 anexado ao post */
  modo?: ModoPublicacao;
}) {
  const admin = criarClienteAdmin();

  const marcar = (campos: Record<string, unknown>) =>
    admin
      .from("publicacoes")
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq("id", registroId);

  try {
    const conta = await contaConectada(usuarioId);
    if (!conta) throw new ErroPublicacao("Nenhuma conta do Instagram conectada.");
    if (new Date(conta.expira_em) < new Date()) {
      throw new ErroPublicacao("A conexão com o Instagram expirou. Conecte novamente.");
    }

    // O conteúdo vem do motor, sempre: assim a edição feita pelo assinante
    // depois do agendamento é respeitada na hora de publicar.
    const pacote = (await motor.lote(usuarioId, loteId)) as {
      posts?: Post[];
      nicho?: { id?: string };
    };
    const post = pacote.posts?.[indice];
    if (!post) throw new ErroPublicacao("Post não encontrado.", 404);

    const mencionarMarca = deveMencionarMarca(pacote.nicho?.id, conta.username);
    const legenda = montarLegenda(post, { mencionarMarca });

    // Reel: só se o assinante pediu e existe MP4 no post. Nunca promove
    // imagem a Reel automaticamente — evita surpresa no feed.
    if (modo === "reels") {
      if (!post.video) {
        throw new ErroPublicacao("Este post ainda não tem vídeo. Envie um MP4 primeiro.");
      }
      const urlVideo = gerarUrlPublica({
        base,
        assinanteId: usuarioId,
        loteId,
        arquivo: post.video,
      });
      const { mediaId } = await publicarReels({
        igUserId: conta.ig_user_id,
        token: conta.token,
        urlVideo,
        legenda,
      });
      await marcar({ situacao: "publicada", ig_media_id: mediaId, erro: null });
      return { mediaId };
    }

    const arquivos =
      post.formato === "carrossel" && post.imagens?.length ? post.imagens : [post.imagem];

    const urls = arquivos.map((arquivo) =>
      gerarUrlPublica({ base, assinanteId: usuarioId, loteId, arquivo }),
    );

    const { mediaId } =
      urls.length > 1
        ? await publicarCarrossel({
            igUserId: conta.ig_user_id,
            token: conta.token,
            urlsImagens: urls,
            legenda,
          })
        : await publicarImagem({
            igUserId: conta.ig_user_id,
            token: conta.token,
            urlImagem: urls[0],
            legenda,
          });

    await marcar({ situacao: "publicada", ig_media_id: mediaId, erro: null });
    return { mediaId };
  } catch (erro) {
    const mensagem = (erro as Error).message;
    await marcar({ situacao: "falhou", erro: mensagem });
    throw erro;
  }
}
