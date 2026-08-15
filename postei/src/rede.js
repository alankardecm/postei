/**
 * Destino do pacote. O assinante escolhe ANTES de gerar.
 *
 * Instagram: 4:5 (1080×1350), o que ocupa o feed.
 * LinkedIn:  1:1 (1080×1080), o card que não corta no desktop.
 * Ambos:     as duas artes (e as duas legendas).
 */

export const REDES = ['instagram', 'linkedin', 'ambos'];

export const TELAS = {
  instagram: { id: 'instagram', largura: 1080, altura: 1350 },
  linkedin: { id: 'linkedin', largura: 1080, altura: 1080 },
};

export function normalizarRede(valor) {
  const v = String(valor || '').trim().toLowerCase();
  return REDES.includes(v) ? v : 'instagram';
}

export function telasDaRede(rede) {
  const r = normalizarRede(rede);
  if (r === 'linkedin') return [TELAS.linkedin];
  if (r === 'ambos') return [TELAS.instagram, TELAS.linkedin];
  return [TELAS.instagram];
}

/** Sufixo no arquivo quando o lote tem as duas telas. */
export function sufixoArquivo(tela, telas) {
  if (telas.length < 2) return '';
  return tela.id === 'linkedin' ? '-linkedin' : '';
}

export function incluiInstagram(rede) {
  return normalizarRede(rede) !== 'linkedin';
}

export function incluiLinkedin(rede) {
  return normalizarRede(rede) !== 'instagram';
}

export function rotuloRede(rede) {
  switch (normalizarRede(rede)) {
    case 'linkedin':
      return 'LinkedIn';
    case 'ambos':
      return 'Instagram e LinkedIn';
    default:
      return 'Instagram';
  }
}
