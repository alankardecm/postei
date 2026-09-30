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

/**
 * Acesso de cortesia: plano cheio, sem cobrança nenhuma.
 *
 * São os donos do produto e quem o vende. Fica em código, e não numa tela de
 * administração, de propósito: é uma lista curta que quase nunca muda, e uma
 * tela para conceder plano de graça é exatamente o tipo de coisa que vira
 * porta de entrada se alguém tomar uma conta.
 *
 * Vale pelo e-mail, então funciona **antes** de a pessoa se cadastrar — quem
 * está na lista já cria a conta com o acesso valendo.
 */
export const CORTESIAS = [
  "alankardecm@gmail.com", // Alan — dono
  "jusantangelo17@gmail.com", // Juliana — piloto
  "juniorreinoo@gmail.com", // Junior — comercial
] as const;

export const PLANO_CORTESIA: Plano = "estudio";

export function ehCortesia(email: string | null | undefined) {
  if (!email) return false;
  return (CORTESIAS as readonly string[]).includes(email.trim().toLowerCase());
}

/**
 * Marca própria da Postei (nicho `postei-marca` + Imagine da xAI).
 *
 * Só Alan e Junior. Cortesia de piloto não entra: Juliana testa o produto
 * do cliente, não o feed da casa, e a chave da xAI não deve ser queimada
 * fora desse uso. Lista curta em código, pelo mesmo motivo da cortesia.
 */
export const DONOS_MARCA = [
  "alankardecm@gmail.com", // Alan — dono
  "juniorreinoo@gmail.com", // Junior — comercial
] as const;

export function ehAcessoMarcaPropria(email: string | null | undefined) {
  if (!email) return false;
  return (DONOS_MARCA as readonly string[]).includes(email.trim().toLowerCase());
}

export const NICHO_MARCA_PROPRIA = "postei-marca";
export const NICHO_AM_CONSULTORIA = "am-consultoria";
export const NICHOS_MARCA_INTERNA = [NICHO_MARCA_PROPRIA, NICHO_AM_CONSULTORIA] as const;
export const INSTAGRAM_MARCA = "cliqueipostei.app";
export const MENCAO_INSTAGRAM_MARCA = `Siga o Postei: @${INSTAGRAM_MARCA}`;

export function jaMencionaMarca(texto: string) {
  return new RegExp(`@${INSTAGRAM_MARCA}\\b`, "i").test(texto);
}

export function ehNichoMarcaPropria(nichoId: string | null | undefined) {
  return nichoId === NICHO_MARCA_PROPRIA;
}

export function ehNichoMarcaInterna(nichoId: string | null | undefined) {
  return Boolean(
    nichoId && (NICHOS_MARCA_INTERNA as readonly string[]).includes(nichoId),
  );
}

/** Sem username, não dá para cravar que é o feed oficial — trata como outro. */
export function ehInstagramDaMarca(username: string | null | undefined) {
  if (!username) return false;
  return username.replace(/^@/, "").trim().toLowerCase() === INSTAGRAM_MARCA;
}

/**
 * Marca própria num Instagram que não é o da casa: a legenda precisa do
 * @ oficial para o toque redirecionar ao perfil da Postei.
 */
export function deveMencionarMarca(
  nichoId: string | null | undefined,
  usernameIg: string | null | undefined,
) {
  return ehNichoMarcaPropria(nichoId) && !ehInstagramDaMarca(usernameIg);
}

/** Volumes que a pessoa pode pedir de uma vez, conforme o plano. */
export function volumesDe(plano: Plano) {
  const limite = PLANOS[plano].posts;
  return [2, 5, 10, 30].filter((v) => v <= limite);
}
