export type SituacaoCard = "parado" | "publicando" | "publicado" | "agendado" | "erro";

export type PublicacaoDoPost = {
  situacao: SituacaoCard;
  quando: string | null;
  erro: string | null;
};

type Linha = {
  indice: number | null;
  situacao: string;
  agendada_para: string;
  erro: string | null;
};

const ORDEM: Record<string, number> = {
  publicando: 4,
  agendada: 3,
  publicada: 2,
  falhou: 1,
};

function doBanco(situacao: string): SituacaoCard {
  if (situacao === "publicada") return "publicado";
  if (situacao === "agendada") return "agendado";
  if (situacao === "publicando") return "publicando";
  if (situacao === "falhou") return "erro";
  return "parado";
}

/** Uma situação por post: o F5 precisa ver o que já está no banco. */
export function situacaoPorIndice(linhas: Linha[]): Map<number, PublicacaoDoPost> {
  const mapa = new Map<number, PublicacaoDoPost>();
  for (const linha of linhas) {
    if (linha.indice == null) continue;
    const atual = mapa.get(linha.indice);
    const nova = ORDEM[linha.situacao] ?? 0;
    const velha = atual
      ? ORDEM[
          atual.situacao === "publicado"
            ? "publicada"
            : atual.situacao === "agendado"
              ? "agendada"
              : atual.situacao === "erro"
                ? "falhou"
                : atual.situacao
        ] ?? 0
      : 0;
    if (!atual || nova > velha) {
      mapa.set(linha.indice, {
        situacao: doBanco(linha.situacao),
        quando: linha.agendada_para,
        erro: linha.erro,
      });
    }
  }
  return mapa;
}
