import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { problemaDaPaleta } from "@/lib/paleta";

/**
 * O DNA de uma marca do assinante.
 *
 * O nicho diz o que NÃO pode ser dito naquele ramo; o DNA diz quem está
 * falando. Sem ele o texto sai correto e genérico — foi exatamente a crítica
 * da primeira usuária real, e o motivo provável de ela não ter publicado.
 *
 * Quem lê e grava é o servidor, sempre filtrando pelo usuário da sessão: o
 * mesmo resultado que a RLS daria, sem repassar o token do usuário até aqui.
 */

const CAMPOS = [
  "quem",
  "publico",
  "metodo",
  "nao_aborda",
  "diferenciais",
  "ofertas",
  "tom",
  "cor_fundo",
  "cor_texto",
  "cor_destaque",
] as const;

/** Teto por campo: o DNA inteiro entra no prompt de CADA bloco de geração.
 *  Sem limite, um texto colado sem cuidado encareceria todos os pacotes. */
const MAX = 600;

export async function GET(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const marca = new URL(request.url).searchParams.get("marca")?.trim();
  if (!marca) return NextResponse.json({ erro: "Informe a marca." }, { status: 400 });

  const admin = criarClienteAdmin();
  const { data, error } = await admin
    .from("marcas_dna")
    .select(CAMPOS.join(","))
    .eq("usuario_id", user.id)
    .eq("marca", marca)
    .maybeSingle();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ dna: data ?? null });
}

export async function PUT(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const marca = String(corpo?.marca ?? "").trim();
  if (!marca) return NextResponse.json({ erro: "Informe a marca." }, { status: 400 });

  const valores: Record<string, string | null> = {};
  for (const campo of CAMPOS) {
    const v = String(corpo?.[campo] ?? "").trim();
    if (v.length > MAX) {
      return NextResponse.json(
        { erro: `O campo "${campo}" passou de ${MAX} caracteres.` },
        { status: 400 },
      );
    }
    valores[campo] = v || null;
  }

  // Recusar aqui, e nao na tela: a arte com texto ilegivel seria culpa do
  // produto aos olhos do assinante, nao da escolha dele.
  const problema = problemaDaPaleta({
    fundo: valores.cor_fundo ?? undefined,
    texto: valores.cor_texto ?? undefined,
    destaque: valores.cor_destaque ?? undefined,
  });
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 });

  const admin = criarClienteAdmin();
  const { error } = await admin.from("marcas_dna").upsert(
    {
      usuario_id: user.id,
      marca,
      ...valores,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "usuario_id,marca" },
  );

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
