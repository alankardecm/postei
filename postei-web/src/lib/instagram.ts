/**
 * Conexão com a API do Instagram (Instagram API with Instagram Login).
 *
 * ⚠️ O `client_id` aqui é o **ID do app do INSTAGRAM**, não o do app da Meta.
 * São números diferentes na mesma tela do painel, e trocar um pelo outro faz
 * a autorização falhar sem mensagem útil.
 */

const APP_ID = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const GRAFO = "https://graph.instagram.com/v23.0";

export const ESCOPOS = ["instagram_business_basic", "instagram_business_content_publish"];

export function urlDeAutorizacao({ redirect, estado }: { redirect: string; estado: string }) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", ESCOPOS.join(","));
  url.searchParams.set("state", estado);
  return url.toString();
}

async function json<T>(resposta: Response, oque: string): Promise<T> {
  const texto = await resposta.text();
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(`${oque}: resposta não é JSON (${texto.slice(0, 120)})`);
  }
  if (!resposta.ok) {
    const e = dados as { error_message?: string; error?: { message?: string } };
    throw new Error(`${oque}: ${e.error_message || e.error?.message || texto.slice(0, 160)}`);
  }
  return dados as T;
}

/** Troca o código da autorização por um token curto (1 hora). */
export async function trocarCodigo({ codigo, redirect }: { codigo: string; redirect: string }) {
  if (!APP_SECRET) throw new Error("INSTAGRAM_APP_SECRET não configurada.");

  const corpo = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirect,
    code: codigo,
  });

  const resposta = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });

  return json<{ access_token: string; user_id: string }>(resposta, "troca do código");
}

/** Converte o token curto em um de 60 dias. */
export async function tokenLongo(tokenCurto: string) {
  if (!APP_SECRET) throw new Error("INSTAGRAM_APP_SECRET não configurada.");

  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", APP_SECRET);
  url.searchParams.set("access_token", tokenCurto);

  return json<{ access_token: string; expires_in: number }>(
    await fetch(url),
    "token de longa duração",
  );
}

/**
 * Renova o token de 60 dias. Só funciona se o token tiver mais de 24h de
 * vida e ainda não estiver vencido -- por isso a renovação é agendada bem
 * antes do vencimento, e não no dia.
 */
export async function renovarToken(token: string) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);

  return json<{ access_token: string; expires_in: number }>(await fetch(url), "renovação do token");
}

export async function perfil(token: string) {
  const url = new URL(`${GRAFO}/me`);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", token);

  return json<{ user_id: string; username: string }>(await fetch(url), "perfil");
}

/**
 * Publicação em dois passos, como a Meta exige:
 * 1. cria um "container" apontando para a URL pública da imagem;
 * 2. publica o container.
 *
 * Entre os dois a Meta baixa e processa a imagem — daí a espera.
 */
export async function publicarImagem({
  igUserId,
  token,
  urlImagem,
  legenda,
}: {
  igUserId: string;
  token: string;
  urlImagem: string;
  legenda: string;
}) {
  const criar = new URL(`${GRAFO}/${igUserId}/media`);
  criar.searchParams.set("image_url", urlImagem);
  criar.searchParams.set("caption", legenda);
  criar.searchParams.set("access_token", token);

  const { id: containerId } = await json<{ id: string }>(
    await fetch(criar, { method: "POST" }),
    "criação do container",
  );

  await esperarProcessamento(containerId, token);

  const publicar = new URL(`${GRAFO}/${igUserId}/media_publish`);
  publicar.searchParams.set("creation_id", containerId);
  publicar.searchParams.set("access_token", token);

  const { id } = await json<{ id: string }>(
    await fetch(publicar, { method: "POST" }),
    "publicação",
  );

  return { mediaId: id, containerId };
}

/**
 * Publicação de carrossel — fluxo de TRÊS passos, diferente do post único:
 * cada imagem vira um container "filho", depois um container do carrossel
 * agrupa os filhos, e só então publica.
 *
 * A legenda vai apenas no container do carrossel; filho com legenda é
 * ignorado. O Instagram aceita de 2 a 10 imagens.
 */
export async function publicarCarrossel({
  igUserId,
  token,
  urlsImagens,
  legenda,
}: {
  igUserId: string;
  token: string;
  urlsImagens: string[];
  legenda: string;
}) {
  if (urlsImagens.length < 2) throw new Error("carrossel precisa de pelo menos 2 imagens.");
  const urls = urlsImagens.slice(0, 10);

  const filhos: string[] = [];
  for (const url of urls) {
    const criar = new URL(`${GRAFO}/${igUserId}/media`);
    criar.searchParams.set("image_url", url);
    criar.searchParams.set("is_carousel_item", "true");
    criar.searchParams.set("access_token", token);

    const { id } = await json<{ id: string }>(
      await fetch(criar, { method: "POST" }),
      `container do slide ${filhos.length + 1}`,
    );
    filhos.push(id);
  }

  // Espera todos ficarem prontos antes de agrupar: agrupar filho ainda em
  // processamento faz o carrossel inteiro falhar sem dizer qual slide.
  for (const [i, filho] of filhos.entries()) {
    await esperarProcessamento(filho, token, 12, `slide ${i + 1}`);
  }

  const agrupar = new URL(`${GRAFO}/${igUserId}/media`);
  agrupar.searchParams.set("media_type", "CAROUSEL");
  agrupar.searchParams.set("children", filhos.join(","));
  agrupar.searchParams.set("caption", legenda);
  agrupar.searchParams.set("access_token", token);

  const { id: containerId } = await json<{ id: string }>(
    await fetch(agrupar, { method: "POST" }),
    "container do carrossel",
  );

  await esperarProcessamento(containerId, token);

  const publicar = new URL(`${GRAFO}/${igUserId}/media_publish`);
  publicar.searchParams.set("creation_id", containerId);
  publicar.searchParams.set("access_token", token);

  const { id } = await json<{ id: string }>(
    await fetch(publicar, { method: "POST" }),
    "publicação do carrossel",
  );

  return { mediaId: id, containerId, slides: filhos.length };
}

/**
 * O container não fica pronto na hora. Publicar antes da hora devolve erro
 * genérico ("media not ready"), então consultamos até FINISHED.
 */
async function esperarProcessamento(
  containerId: string,
  token: string,
  tentativas = 12,
  rotulo = "a imagem",
) {
  for (let i = 0; i < tentativas; i += 1) {
    await new Promise((r) => setTimeout(r, 3000));

    const url = new URL(`${GRAFO}/${containerId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", token);

    const { status_code, status } = await json<{ status_code: string; status?: string }>(
      await fetch(url),
      "status do container",
    );

    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`o Instagram recusou ${rotulo}: ${status || status_code}`);
    }
  }
  throw new Error(`o Instagram não terminou de processar ${rotulo} a tempo.`);
}
