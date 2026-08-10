import { criarClienteAdmin } from "@/lib/supabase/admin";
import { PLANOS, PLANO_PADRAO, PLANO_CORTESIA, ehCortesia, type Plano } from "@/lib/planos";

/**
 * Cota mensal por assinante.
 *
 * Sem isto, um usuário gera sem parar e **queima a cota do provedor de todos
 * os outros** — o problema aparece com o terceiro cliente, não com o décimo.
 *
 * A reserva acontece no banco, numa função só: entre "ler o consumo" e
 * "gravar o novo" cabem duas requisições simultâneas, e as duas passariam.
 */

/** Ciclo em que a data cai, respeitando o dia de virada do assinante. */
export function cicloDe(data: Date, diaCiclo: number) {
  const d = new Date(data);
  if (d.getDate() < diaCiclo) d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function assinaturaDe(usuarioId: string) {
  const admin = criarClienteAdmin();

  const { data } = await admin
    .from("assinaturas")
    .select("plano, ativa, dia_ciclo, status_pagamento, proximo_pagamento, cortesia")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (data)
    return data as {
      plano: Plano;
      ativa: boolean;
      dia_ciclo: number;
      status_pagamento: string;
      proximo_pagamento: string | null;
      cortesia: boolean;
    };

  // Primeiro acesso: cria o plano de teste, com o ciclo virando no dia do
  // cadastro. Assim a renovação acompanha a data de pagamento, não o dia 1º.
  //
  // Quem está na lista de cortesia já nasce com o plano cheio -- é o que faz
  // funcionar para quem ainda nem se cadastrou.
  const { data: dono } = await admin.auth.admin.getUserById(usuarioId);
  const cortesia = ehCortesia(dono?.user?.email);

  const dia = Math.min(new Date().getDate(), 28);
  const plano = cortesia ? PLANO_CORTESIA : PLANO_PADRAO;

  await admin
    .from("assinaturas")
    .insert({ usuario_id: usuarioId, plano, dia_ciclo: dia, cortesia });

  return {
    plano,
    ativa: true,
    dia_ciclo: dia,
    // "sem_cobranca" já é o estado certo: cortesia não tem o que cobrar. Quem
    // distingue os dois é a coluna `cortesia`, e o banco tem uma restrição
    // que só aceita os estados conhecidos -- inventar um valor aqui quebraria
    // o cadastro na hora.
    status_pagamento: "sem_cobranca",
    proximo_pagamento: null,
    cortesia,
  };
}

export async function consumoDe(usuarioId: string) {
  const assinatura = await assinaturaDe(usuarioId);
  const limites = PLANOS[assinatura.plano];
  const ciclo = cicloDe(new Date(), assinatura.dia_ciclo);

  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("consumo")
    .select("posts, marcas")
    .eq("usuario_id", usuarioId)
    .eq("ciclo", ciclo)
    .maybeSingle();

  return {
    plano: assinatura.plano,
    ativa: assinatura.ativa,
    cortesia: assinatura.cortesia,
    statusPagamento: assinatura.status_pagamento,
    proximoPagamento: assinatura.proximo_pagamento,
    ciclo,
    limites,
    usados: data?.posts ?? 0,
    marcas: (data?.marcas ?? []) as string[],
    restantes: Math.max(0, limites.posts - (data?.posts ?? 0)),
  };
}

export class SemCota extends Error {
  constructor(mensagem: string) {
    super(mensagem);
  }
}

/** Reserva antes de gerar. Lança `SemCota` com mensagem pronta para a tela. */
export async function reservar({
  usuarioId,
  posts,
  marca,
}: {
  usuarioId: string;
  posts: number;
  marca: string;
}) {
  const assinatura = await assinaturaDe(usuarioId);
  if (!assinatura.ativa) {
    throw new SemCota("Sua assinatura está inativa. Fale com a gente para reativar.");
  }

  const limites = PLANOS[assinatura.plano];
  const ciclo = cicloDe(new Date(), assinatura.dia_ciclo);

  const admin = criarClienteAdmin();
  const { data, error } = await admin.rpc("reservar_cota", {
    p_usuario: usuarioId,
    p_ciclo: ciclo,
    p_posts: posts,
    p_marca: marca,
    p_limite_posts: limites.posts,
    p_limite_marcas: limites.marcas,
  });

  if (error) throw new SemCota("Não consegui verificar sua cota.");

  if (data === -1) {
    const uso = await consumoDe(usuarioId);
    throw new SemCota(
      `Seu plano ${limites.nome} permite ${limites.posts} posts por mês e ` +
        `você já usou ${uso.usados}. Restam ${uso.restantes}.`,
    );
  }
  if (data === -2) {
    throw new SemCota(
      `Seu plano ${limites.nome} permite ${limites.marcas} ` +
        `${limites.marcas === 1 ? "marca" : "marcas"} por mês.`,
    );
  }

  return { ciclo, restantes: data as number };
}

/** Devolve o que não foi usado quando o lote sai menor que o pedido. */
export async function devolver(usuarioId: string, ciclo: string, posts: number) {
  if (posts <= 0) return;
  const admin = criarClienteAdmin();
  await admin.rpc("devolver_cota", { p_usuario: usuarioId, p_ciclo: ciclo, p_posts: posts });
}
