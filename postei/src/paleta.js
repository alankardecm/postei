/**
 * A paleta que a arte usa: a da marca, quando existe e serve.
 *
 * Antes a cor vinha so do nicho -- dois assinantes do mesmo ramo tinham
 * feeds visualmente identicos, mudando apenas o nome no rodape. Para um
 * produto de assinatura isso e problema de retencao: no dia em que os dois
 * se descobrem, os dois percebem que o feed nao e deles.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** Contraste minimo entre texto e fundo (WCAG AA para texto grande). */
const CONTRASTE_MINIMO = 3;

function canal(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razao de contraste entre duas cores, de 1 (igual) a 21 (preto/branco). */
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Diz se a paleta e usavel, e por que nao quando nao e.
 *
 * O assinante escolhe as cores sem ver o resultado. Texto claro sobre fundo
 * claro produz arte ilegivel -- e ele vai culpar o produto, nao a propria
 * escolha. Melhor recusar na hora de salvar, explicando.
 */
export function conferirPaleta(paleta) {
  if (!paleta) return { ok: false, motivo: 'sem paleta' };

  for (const [campo, valor] of Object.entries(paleta)) {
    if (!HEX.test(String(valor ?? ''))) {
      return { ok: false, motivo: `A cor de ${campo} precisa estar no formato #rrggbb.` };
    }
  }

  const texto = contraste(paleta.texto, paleta.fundo);
  if (texto < CONTRASTE_MINIMO) {
    return {
      ok: false,
      motivo:
        `O texto quase some no fundo (contraste ${texto.toFixed(1)}, ` +
        `o mínimo é ${CONTRASTE_MINIMO}). Escureça o fundo ou clareie o texto.`,
    };
  }

  const destaque = contraste(paleta.destaque, paleta.fundo);
  if (destaque < CONTRASTE_MINIMO) {
    return {
      ok: false,
      motivo:
        `A cor de destaque quase some no fundo (contraste ${destaque.toFixed(1)}, ` +
        `o mínimo é ${CONTRASTE_MINIMO}). Ela é usada no título e na barra da assinatura.`,
    };
  }

  return { ok: true };
}

/**
 * A paleta da marca quando ela existe e passa na conferencia; senao, a do
 * nicho. Nunca deixa a geracao falhar por causa de cor: pacote com a cor do
 * nicho e melhor que pacote nenhum.
 */
export function paletaDaMarca(nicho, dna) {
  const marca = {
    fundo: dna?.cor_fundo,
    texto: dna?.cor_texto,
    destaque: dna?.cor_destaque,
  };

  if (!marca.fundo || !marca.texto || !marca.destaque) return nicho.paleta;

  const conferida = conferirPaleta(marca);
  if (!conferida.ok) {
    console.error('[postei] paleta da marca recusada:', conferida.motivo);
    return nicho.paleta;
  }
  return marca;
}
