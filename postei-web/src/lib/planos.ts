/**
 * Os planos e seus limites.
 *
 * Vive em código, não em tabela: são poucos, mudam junto com a página de
 * preços, e ler de tabela só criaria a chance de o limite cobrado e o
 * limite aplicado divergirem.
 */
export const PLANOS = {
  // Teste de verdade: a pessoa vê um carrossel completo ou dois posts, e
  // agenda uma publicação para sentir o ciclo inteiro. Não edita o texto --
  // revisar e ajustar é justamente o que se paga para ter.
  teste: {
    nome: "Teste",
    posts: 2,
    marcas: 1,
    preco: null,
    podeEditar: false,
    agendamentos: 1,
  },
  essencial: {
    nome: "Essencial",
    posts: 30,
    marcas: 1,
    preco: "39,90",
    podeEditar: true,
    agendamentos: null, // sem limite
  },
  profissional: {
    nome: "Profissional",
    posts: 90,
    marcas: 3,
    preco: "89,90",
    podeEditar: true,
    agendamentos: null,
  },
  estudio: {
    nome: "Estúdio",
    posts: 300,
    marcas: 10,
    preco: "199,90",
    podeEditar: true,
    agendamentos: null,
  },
} as const;

export type Plano = keyof typeof PLANOS;

export const PLANO_PADRAO: Plano = "teste";

/** Volumes que a pessoa pode pedir de uma vez, conforme o plano. */
export function volumesDe(plano: Plano) {
  const limite = PLANOS[plano].posts;
  return [2, 5, 10, 30].filter((v) => v <= limite);
}
