import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave de SERVIÇO. Ignora RLS de propósito.
 *
 * Existe só para gravar clique e contato vindos de visitante anônimo: o
 * visitante nunca fala com o banco, fala com o servidor do painel, que
 * grava por ele. Assim as tabelas continuam fechadas para o público.
 *
 * NUNCA importar isto de um componente com "use client" -- a chave daria
 * acesso total ao banco se chegasse ao navegador.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_KEY não configurada.");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Código curto do link. Alfabeto sem 0/O/1/l/I para o assinante conseguir
 * ditar o link por telefone sem gerar confusão.
 */
export function gerarCodigo(tamanho = 7) {
  const alfabeto = "23456789abcdefghijkmnpqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}
