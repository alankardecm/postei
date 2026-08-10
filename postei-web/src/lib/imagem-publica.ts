import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * URL pública, assinada e temporária para uma imagem de um lote.
 *
 * Existe por uma exigência da Meta: ao publicar, ela NÃO recebe o arquivo —
 * recebe uma URL e baixa dos servidores dela. Como as imagens do painel
 * ficam atrás de login, a Meta levaria 401 e a publicação falharia.
 *
 * Em vez de abrir o acervo, cada post ganha um endereço próprio que:
 *   - vale só para aquele arquivo daquele lote daquele assinante;
 *   - expira em minutos;
 *   - é impossível de adivinhar ou alterar sem a chave do servidor.
 */

/**
 * Segredo PRÓPRIO, separado da chave que o painel usa para falar com o motor.
 *
 * Antes os dois eram a mesma coisa, e isso prendia um ao outro: rotacionar a
 * chave de acesso invalidava, de tabela, todas as URLs assinadas em
 * circulação. São responsabilidades diferentes e devem poder ser trocadas
 * em separado.
 *
 * Lido a cada uso e sem valor padrão: com `|| ""` uma variável ausente
 * assinaria com chave vazia, qualquer um forjaria URL e nada acusaria. É
 * melhor a publicação falhar com erro claro.
 */
function segredo() {
  const s = process.env.POSTEI_SEGREDO_IMAGEM;
  if (!s) throw new Error("POSTEI_SEGREDO_IMAGEM não configurada no servidor.");
  return s;
}

/** Janela curta: a Meta baixa a imagem em segundos, não em horas. */
const VALIDADE_MS = 15 * 60 * 1000;

function assinar(carga: string) {
  return createHmac("sha256", segredo()).update(carga).digest("base64url");
}

export function gerarUrlPublica({
  base,
  assinanteId,
  loteId,
  arquivo,
}: {
  base: string;
  assinanteId: string;
  loteId: string;
  arquivo: string;
}) {
  const expira = Date.now() + VALIDADE_MS;
  const carga = `${assinanteId}:${loteId}:${arquivo}:${expira}`;
  const dados = Buffer.from(carga).toString("base64url");
  return `${base}/api/publico/imagem/${dados}/${assinar(carga)}`;
}

export function conferirUrlPublica(dados: string, assinatura: string) {
  let carga: string;
  try {
    carga = Buffer.from(dados, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const esperada = assinar(carga);
  // Comparação em tempo constante: comparar com === vaza, pelo tempo de
  // resposta, quantos caracteres iniciais o atacante acertou.
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [assinanteId, loteId, arquivo, expira] = carga.split(":");
  if (!assinanteId || !loteId || !arquivo) return null;
  if (Number(expira) < Date.now()) return null;

  return { assinanteId, loteId, arquivo };
}
