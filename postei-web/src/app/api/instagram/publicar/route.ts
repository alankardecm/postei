import { NextResponse } from "next/server";
import { usuarioAtual, motor } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarUrlPublica } from "@/lib/imagem-publica";
import { publicarImagem, publicarCarrossel } from "@/lib/instagram";

type Post = {
  imagem: string;
  fonte: { titulo: string; revista: string; ano: string; url: string } | null;
  imagens: string[] | null;
  formato: string;
  legenda: string;
  cta: string | null;
  hashtags: string[];
};

/** Publica um post de um lote no Instagram conectado. */
export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const loteId = typeof corpo?.loteId === "string" ? corpo.loteId : "";
  const indice = Number(corpo?.indice);

  if (!loteId || !Number.isInteger(indice) || indice < 0) {
    return NextResponse.json({ erro: "Informe o lote e qual post publicar." }, { status: 400 });
  }

  const admin = criarClienteAdmin();
  const { data: conta } = await admin
    .from("contas_instagram")
    .select("id, ig_user_id, token, expira_em")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!conta) {
    return NextResponse.json({ erro: "Conecte seu Instagram antes." }, { status: 400 });
  }
  if (new Date(conta.expira_em) < new Date()) {
    return NextResponse.json(
      { erro: "A conexão com o Instagram expirou. Conecte novamente." },
      { status: 400 },
    );
  }

  // O conteúdo vem do motor, não do navegador: assim o cliente não consegue
  // mandar publicar um texto que não foi gerado para ele.
  const pacote = (await motor.lote(user.id, loteId)) as { posts?: Post[] };
  const post = pacote.posts?.[indice];
  if (!post) return NextResponse.json({ erro: "Post não encontrado." }, { status: 404 });

  const legenda = [post.legenda, post.cta, post.hashtags.map((h) => `#${h}`).join(" ")]
    .filter(Boolean)
    .join("\n\n");

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  // Carrossel tem uma URL assinada por slide; post único, uma só.
  const arquivos =
    post.formato === "carrossel" && post.imagens?.length ? post.imagens : [post.imagem];

  const urls = arquivos.map((arquivo) =>
    gerarUrlPublica({ base, assinanteId: user.id, loteId, arquivo }),
  );

  const { data: registro } = await admin
    .from("publicacoes")
    .insert({
      usuario_id: user.id,
      conta_id: conta.id,
      lote_id: loteId,
      arquivo: post.imagem,
      legenda,
      agendada_para: new Date().toISOString(),
      situacao: "publicando",
    })
    .select("id")
    .single();

  try {
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

    await admin
      .from("publicacoes")
      .update({ situacao: "publicada", ig_media_id: mediaId, atualizado_em: new Date().toISOString() })
      .eq("id", registro!.id);

    return NextResponse.json({ ok: true, mediaId });
  } catch (erro) {
    const mensagem = (erro as Error).message;
    await admin
      .from("publicacoes")
      .update({ situacao: "falhou", erro: mensagem, atualizado_em: new Date().toISOString() })
      .eq("id", registro!.id);

    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
