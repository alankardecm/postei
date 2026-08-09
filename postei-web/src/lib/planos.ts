/**
 * Os planos e seus limites.
 *
 * Vive em código, não em tabela: são poucos, mudam junto com a página de
 * preços, e ler de tabela só criaria a chance de o limite cobrado e o limite
 * aplicado divergirem.
 */
export const PLANOS = {
  teste: { nome: "Teste", posts: 10, marcas: 1, preco: null },
  essencial: { nome: "Essencial", posts: 30, marcas: 1, preco: "39,90" },
  profissional: { nome: "Profissional", posts: 90, marcas: 3, preco: "89,90" },
  estudio: { nome: "Estúdio", posts: 300, marcas: 10, preco: "199,90" },
} as const;

export type Plano = keyof typeof PLANOS;

export const PLANO_PADRAO: Plano = "teste";
