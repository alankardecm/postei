import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * Ponte com o motor de geracao (Express, /opt/postei).
 *
 * Roda SEMPRE no servidor: a chave nunca pode chegar ao navegador. Por isso
 * este arquivo nao tem "use client" e as variaveis nao levam NEXT_PUBLIC_.
 *
 * O id do assinante e sempre lido da sessao do Supabase aqui dentro, nunca
 * recebido do formulario -- se viesse do cliente, bastaria trocar o valor
 * para ler o pacote de outra pessoa.
 */

const BASE = process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710";
const CHAVE = process.env.POSTEI_API_KEY;

export class ErroMotor extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

export async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function chamar<T>(
  caminho: string,
  assinanteId: string,
  init: RequestInit = {},
): Promise<T> {
  if (!CHAVE) {
    throw new ErroMotor("POSTEI_API_KEY não configurada no painel.", 500);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-postei-chave": CHAVE,
        "x-postei-assinante": assinanteId,
        ...(init.headers || {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ErroMotor("O motor de geração não respondeu. Ele está no ar?", 503);
  }

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    throw new ErroMotor(dados?.erro || `Motor devolveu ${resposta.status}.`, resposta.status);
  }
  return dados as T;
}

export type Rede = "instagram" | "linkedin" | "ambos";

export type Lote = {
  loteId: string;
  nicho: { id: string; nome: string };
  marca: string;
  geradoEm: string;
  posts: number;
  parcial: boolean;
  rede?: Rede;
  capa: string | null;
};

export type Tarefa = {
  id: string;
  situacao: "gerando" | "pronta" | "falhou";
  resultado: { loteId: string; posts: number; solicitados: number; parcial: boolean } | null;
  erro: string | null;
};

export type Nicho = { id: string; nome: string; publico: string; interno?: boolean };

export const motor = {
  nichos: (assinanteId: string, opts?: { internos?: boolean }) =>
    chamar<Nicho[]>("/nichos", assinanteId, {
      headers: opts?.internos ? { "x-postei-internos": "1" } : {},
    }),

  lotes: (assinanteId: string) => chamar<Lote[]>("/lotes", assinanteId),

  lote: (assinanteId: string, loteId: string) =>
    chamar<Record<string, unknown>>(`/lotes/${encodeURIComponent(loteId)}`, assinanteId),

  criarTarefa: (
    assinanteId: string,
    pedido: {
      nicho: string;
      marca: string;
      quantidade: number;
      ciclo?: string;
      rede?: Rede;
      marcaDagua?: boolean;
    },
    opts?: { internos?: boolean },
  ) =>
    chamar<{ id: string; situacao: string }>("/tarefas", assinanteId, {
      method: "POST",
      body: JSON.stringify(pedido),
      headers: opts?.internos ? { "x-postei-internos": "1" } : {},
    }),

  tarefa: (assinanteId: string, id: string) =>
    chamar<Tarefa>(`/tarefas/${encodeURIComponent(id)}`, assinanteId),
};
