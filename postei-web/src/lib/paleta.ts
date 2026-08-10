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

function luminancia(hex: string) {
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
