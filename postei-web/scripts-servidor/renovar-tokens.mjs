/**
 * Renova os tokens do Instagram antes de vencerem.
 *
 * O token de longa duração vale 60 dias. Se vencer, a conexão do assinante
 * cai sozinha e ele só descobre quando um post falhar -- por isso isto roda
 * todo dia, e renova com folga em vez de esperar o último momento.
 *
 * Regras da Meta: só é possível renovar um token com MAIS de 24h de vida e
 * que ainda NÃO tenha vencido. Vencido, não há recuperação: o assinante
 * precisa conectar de novo.
 *
 * Uso:  node /opt/postei-web/scripts-servidor/renovar-tokens.mjs
 */
import fs from "node:fs";

const ENV = "/opt/postei-web/.env.production";

/** Renova quando faltarem menos que isto. Folga grande de propósito: se uma
 *  execução falhar, ainda restam dias de tentativas diárias.
 *  Aceita argumento para poder testar o caminho de renovação sem esperar
 *  45 dias: `node renovar-tokens.mjs 90`. */
const DIAS_DE_FOLGA = Number(process.argv[2]) || 15;

const env = Object.fromEntries(
  fs
    .readFileSync(ENV, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const agora = new Date();
const marca = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const log = (...m) => console.log(`[${marca()}]`, ...m);

const cabecalho = {
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const limite = new Date(agora.getTime() + DIAS_DE_FOLGA * 864e5).toISOString();

const contas = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/contas_instagram` +
    `?select=id,username,token,expira_em&expira_em=lt.${limite}`,
  { headers: cabecalho },
).then((r) => r.json());

if (!Array.isArray(contas)) {
  log("ERRO ao consultar o banco:", JSON.stringify(contas).slice(0, 200));
  process.exit(1);
}

if (contas.length === 0) {
  log("nenhum token perto de vencer.");
  process.exit(0);
}

log(`${contas.length} token(s) para renovar.`);

let falhas = 0;

for (const conta of contas) {
  const rotulo = `@${conta.username ?? conta.id.slice(0, 8)}`;
  const vencido = new Date(conta.expira_em) < agora;

  if (vencido) {
    // Não há como renovar token vencido. Registrar é o que resta -- e é o
    // sinal de que o assinante precisa reconectar.
    log(`${rotulo}: JÁ VENCEU em ${conta.expira_em.slice(0, 10)} — precisa reconectar.`);
    falhas += 1;
    continue;
  }

  try {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", conta.token);

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (!resposta.ok || !dados.access_token) {
      throw new Error(dados?.error?.message || JSON.stringify(dados).slice(0, 160));
    }

    const novaExpiracao = new Date(Date.now() + dados.expires_in * 1000).toISOString();

    const gravou = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/contas_instagram?id=eq.${conta.id}`,
      {
        method: "PATCH",
        headers: cabecalho,
        body: JSON.stringify({
          token: dados.access_token,
          expira_em: novaExpiracao,
          atualizado_em: new Date().toISOString(),
        }),
      },
    );

    if (!gravou.ok) throw new Error(`falha ao gravar: HTTP ${gravou.status}`);

    // Conferir o RESULTADO, não a resposta. A Meta devolve 200 mesmo quando
    // a renovação não teve efeito -- foi o que aconteceu ao tentar renovar
    // um token com menos de 24h de vida: veio token novo, validade igual.
    // Sem esta checagem a rotina reportaria sucesso todo dia enquanto o
    // prazo escorre até vencer.
    const ganhoEmDias =
      (new Date(novaExpiracao) - new Date(conta.expira_em)) / 864e5;

    if (ganhoEmDias < 1) {
      log(
        `${rotulo}: ATENÇÃO — a validade não avançou ` +
          `(${ganhoEmDias.toFixed(1)} dia). Token com menos de 24h de vida ` +
          `não é renovável; tentará de novo amanhã.`,
      );
      falhas += 1;
    } else {
      log(
        `${rotulo}: renovado até ${novaExpiracao.slice(0, 10)} ` +
          `(+${ganhoEmDias.toFixed(0)} dias).`,
      );
    }
  } catch (erro) {
    log(`${rotulo}: FALHOU — ${erro.message}`);
    falhas += 1;
  }
}

process.exit(falhas > 0 ? 1 : 0);
