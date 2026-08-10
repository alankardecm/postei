/**
 * Contraste da paleta da marca.
 *
 * Existe nos dois lados de propósito: aqui para avisar o assinante enquanto
 * ele escolhe, e no motor (`postei/src/paleta.js`) para nunca renderizar arte
 * ilegível — nem se a linha tiver sido gravada por outro caminho.
 *
 * Se mexer na regra, mexa nos dois.
 */

export const HEX = /^#[0-9a-f]{6}$/i;

/** WCAG AA para texto grande. Abaixo disso a arte fica desconfortável. */
export const CONTRASTE_MINIMO = 3;

function canal(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * canal((n >> 16) & 255) +
    0.7152 * canal((n >> 8) & 255) +
    0.0722 * canal(n & 255)
  );
}

export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export type Paleta = { fundo: string; texto: string; destaque: string };

/** Aceita `2E1065`, `#2e1065`, `# 2E1065`. Quem cola um hex vindo do manual
 *  da marca não deve ter que se preocupar com o formato. */
export function normalizarHex(bruto: string) {
  const limpo = bruto.trim().replace(/^#/, "").replace(/\s/g, "");
  // Forma curta (#abc) é comum em manual de marca.
  const expandido =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  return /^[0-9a-f]{6}$/i.test(expandido) ? `#${expandido.toLowerCase()}` : null;
}

function componentes(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paraHex([r, g, b]: number[]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A cor legível mais próxima da que a pessoa escolheu.
 *
 * Existe para não mandar embora quem tem paleta de marca real: um bege com
 * dourado é identidade legítima e reprova no contraste. Em vez de recusar,
 * mexemos SÓ no que precisa — clareando ou escurecendo a própria cor, sem
 * trocar o matiz — e mantemos fundo e destaque como a marca manda.
 */
export function aproximarLegivel(cor: string, fundo: string): string {
  if (contraste(cor, fundo) >= CONTRASTE_MINIMO) return cor;

  const rgb = componentes(cor);
  // Fundo escuro pede texto mais claro, e vice-versa.
  const paraClaro = luminancia(fundo) < 0.5;

  let melhor = cor;
  for (let passo = 1; passo <= 100; passo += 1) {
    const f = passo / 100;
    const ajustada = paraHex(
      rgb.map((v) => (paraClaro ? v + (255 - v) * f : v * (1 - f))),
    );
    melhor = ajustada;
    if (contraste(ajustada, fundo) >= CONTRASTE_MINIMO) break;
  }
  return melhor;
}

/** `null` quando está tudo certo; a explicação quando não está. */
export function problemaDaPaleta(p: Partial<Paleta>): string | null {
  const preenchidos = [p.fundo, p.texto, p.destaque].filter(Boolean).length;
  if (preenchidos === 0) return null; // sem cor própria: usa a do nicho
  if (preenchidos < 3) return "Escolha as três cores, ou deixe as três em branco.";

  for (const [nome, valor] of [
    ["fundo", p.fundo],
    ["texto", p.texto],
    ["destaque", p.destaque],
  ] as const) {
    if (!HEX.test(String(valor))) return `A cor de ${nome} precisa estar no formato #rrggbb.`;
  }

  const texto = contraste(p.texto!, p.fundo!);
  if (texto < CONTRASTE_MINIMO) {
    return `O texto quase some no fundo (contraste ${texto.toFixed(1)}; o mínimo é ${CONTRASTE_MINIMO}).`;
  }

  const destaque = contraste(p.destaque!, p.fundo!);
  if (destaque < CONTRASTE_MINIMO) {
    return `O destaque quase some no fundo (contraste ${destaque.toFixed(1)}; o mínimo é ${CONTRASTE_MINIMO}).`;
  }

  return null;
}
