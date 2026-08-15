import { NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { publicarAgora } from "@/lib/publicacao";
import { publicarLinkedinAgora } from "@/lib/publicacao-linkedin";

/**
 * Publica o que está vencido na fila.
 *
 * Chamada pelo cron do servidor, não por navegador. Roda dentro do Next de
 * propósito: assim reaproveita a MESMA função que o botão do painel usa.
 * Um script separado seria uma segunda implementação da publicação, e as
 * duas se desencontrariam com o tempo.
 */

/** Teto por execução: evita que uma fila grande estoure a cota do provedor
 *  ou segure a requisição por muito tempo. O resto sai na próxima rodada. */
const MAX_POR_RODADA = 5;

export async function POST(request: Request) {
  const segredo = process.env.POSTEI_API_KEY;
  if (!segredo || request.headers.get("x-postei-chave") !== segredo) {
    return NextResponse.json({ erro: "Chave inválida." }, { status: 401 });
  }

  const admin = criarClienteAdmin();
  const agora = new Date().toISOString();

  const { data: fila, error } = await admin
    .from("publicacoes")
    .select("id, usuario_id, lote_id, indice")
    .eq("situacao", "agendada")
    .lte("agendada_para", agora)
    .order("agendada_para", { ascending: true })
    .limit(MAX_POR_RODADA);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  if (!fila?.length) return NextResponse.json({ publicados: 0, falhas: 0 });

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  let publicados = 0;
  let falhas = 0;

  for (const item of fila) {
    // Marca como "publicando" ANTES de começar: se a rotina rodar de novo
    // durante uma publicação demorada, ela não pega o mesmo item duas vezes
    // e o assinante não posta duplicado.
    const { data: travou } = await admin
      .from("publicacoes")
      .update({ situacao: "publicando", atualizado_em: new Date().toISOString() })
      .eq("id", item.id)
      .eq("situacao", "agendada")
      .select("id");

    if (!travou?.length) continue;

    try {
      await publicarAgora({
        usuarioId: item.usuario_id,
        loteId: item.lote_id,
        indice: item.indice,
        registroId: item.id,
        base,
      });
      publicados += 1;
    } catch (erro) {
      // `publicarAgora` já gravou a falha no registro; aqui só contamos.
      console.error(`[postei][cron] ${item.lote_id}#${item.indice}:`, (erro as Error).message);
      falhas += 1;
    }
  }

  const { data: filaLi, error: erroLi } = await admin
    .from("publicacoes_linkedin")
    .select("id, usuario_id, lote_id, indice")
    .eq("situacao", "agendada")
    .lte("agendada_para", agora)
    .order("agendada_para", { ascending: true })
    .limit(MAX_POR_RODADA);

  if (erroLi) return NextResponse.json({ erro: erroLi.message }, { status: 500 });

  for (const item of filaLi ?? []) {
    const { data: travou } = await admin
      .from("publicacoes_linkedin")
      .update({ situacao: "publicando", atualizado_em: new Date().toISOString() })
      .eq("id", item.id)
      .eq("situacao", "agendada")
      .select("id");

    if (!travou?.length) continue;

    try {
      await publicarLinkedinAgora({
        usuarioId: item.usuario_id,
        loteId: item.lote_id,
        indice: item.indice,
        registroId: item.id,
        base,
      });
      publicados += 1;
    } catch (erro) {
      console.error(`[postei][cron-li] ${item.lote_id}#${item.indice}:`, (erro as Error).message);
      falhas += 1;
    }
  }

  return NextResponse.json({ publicados, falhas });
}
