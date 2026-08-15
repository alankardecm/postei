/**
 * LinkedIn — Share on LinkedIn (perfil pessoal).
 *
 * Client ID / Secret no .env. OAuth 3-legged, escopos:
 *   openid profile email w_member_social
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

export const ESCOPOS = ["openid", "profile", "email", "w_member_social"];

function exigirCredenciais() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET não configurados.");
  }
}

export function criarEstadoOAuth(usuarioId: string) {
  exigirCredenciais();
  const nonce = randomBytes(16).toString("hex");
  const expira = String(Date.now() + 15 * 60 * 1000);
  const carga = `${nonce}.${usuarioId}.${expira}`;
  const sig = createHmac("sha256", CLIENT_SECRET!).update(carga).digest("base64url");
  return `${carga}.${sig}`;
}

export function validarEstadoOAuth(estado: string, usuarioId: string) {
  if (!CLIENT_SECRET || !estado) return false;
  const partes = estado.split(".");
  if (partes.length !== 4) return false;
  const [nonce, uid, expira, sig] = partes;
  if (!nonce || !uid || !expira || !sig) return false;
  if (uid !== usuarioId) return false;
  if (Number(expira) < Date.now()) return false;
  const carga = `${nonce}.${uid}.${expira}`;
  const esperada = createHmac("sha256", CLIENT_SECRET).update(carga).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(esperada);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function urlDeAutorizacao({ redirect, estado }: { redirect: string; estado: string }) {
  exigirCredenciais();
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("state", estado);
  url.searchParams.set("scope", ESCOPOS.join(" "));
  return url.toString();
}

async function json<T>(resposta: Response, oque: string): Promise<T> {
  const texto = await resposta.text();
  let dados: unknown = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    throw new Error(`${oque}: resposta não é JSON (${texto.slice(0, 140)})`);
  }
  if (!resposta.ok) {
    const e = dados as { error_description?: string; message?: string; error?: string };
    throw new Error(
      `${oque}: ${e?.error_description || e?.message || e?.error || texto.slice(0, 180)}`,
    );
  }
  return dados as T;
}

export async function trocarCodigo({ codigo, redirect }: { codigo: string; redirect: string }) {
  exigirCredenciais();
  const corpo = new URLSearchParams({
    grant_type: "authorization_code",
    code: codigo,
    redirect_uri: redirect,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
  });
  const resposta = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  return json<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  }>(resposta, "troca do código LinkedIn");
}

export async function renovarToken(refreshToken: string) {
  exigirCredenciais();
  const corpo = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
  });
  const resposta = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  return json<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>(resposta, "renovação do token LinkedIn");
}

export async function perfil(token: string) {
  const resposta = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dados = await json<{ sub: string; name?: string }>(resposta, "perfil LinkedIn");
  if (!dados.sub) throw new Error("LinkedIn não devolveu o id da pessoa.");
  return {
    personUrn: `urn:li:person:${dados.sub}`,
    nome: dados.name || null,
  };
}

async function registrarUpload({ token, personUrn }: { token: string; personUrn: string }) {
  const resposta = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: personUrn,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  const dados = await json<{
    value: {
      asset: string;
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string };
      };
    };
  }>(resposta, "registro do upload");
  const uploadUrl =
    dados.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
      .uploadUrl;
  return { asset: dados.value.asset, uploadUrl };
}

async function enviarBinario({
  uploadUrl,
  token,
  bytes,
}: {
  uploadUrl: string;
  token: string;
  bytes: Buffer;
}) {
  const resposta = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg",
    },
    body: new Uint8Array(bytes),
  });
  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`upload da imagem: ${resposta.status} ${texto.slice(0, 160)}`);
  }
}

export async function publicarImagens({
  token,
  personUrn,
  imagens,
  legenda,
}: {
  token: string;
  personUrn: string;
  imagens: Buffer[];
  legenda: string;
}) {
  if (!imagens.length) throw new Error("Nenhuma imagem para publicar.");

  const assets: string[] = [];
  for (const bytes of imagens.slice(0, 9)) {
    const { asset, uploadUrl } = await registrarUpload({ token, personUrn });
    await enviarBinario({ uploadUrl, token, bytes });
    assets.push(asset);
  }

  const resposta = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: legenda.slice(0, 3000) },
          shareMediaCategory: "IMAGE",
          media: assets.map((asset) => ({
            status: "READY",
            media: asset,
          })),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`publicação LinkedIn: ${resposta.status} ${texto.slice(0, 220)}`);
  }

  const urn = resposta.headers.get("x-restli-id") || resposta.headers.get("X-RestLi-Id") || "";
  return { postUrn: urn };
}
