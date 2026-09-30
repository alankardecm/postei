import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/motor";
import { ehAcessoMarcaPropria } from "@/lib/planos";
import { assinaturaDe } from "@/lib/cota";

export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });
  if (!ehAcessoMarcaPropria(user.email)) return NextResponse.json({ erro: "Disponível para a marca própria." }, { status: 403 });
  const assinatura = await assinaturaDe(user.id);
  if (!assinatura.ativa) return NextResponse.json({ erro: "Sua assinatura está inativa." }, { status: 403 });
  const chave = process.env.POSTEI_API_KEY;
  if (!chave) return NextResponse.json({ erro: "Importação indisponível neste ambiente." }, { status: 503 });
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const marca = String(form.get("marca") || "").trim();
    const titulo = String(form.get("titulo") || "").trim();
    const legenda = String(form.get("legenda") || "").trim();
    if (!(arquivo instanceof File) || !arquivo.size || arquivo.size > 8 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(arquivo.type)) {
      return NextResponse.json({ erro: "Envie JPEG, PNG ou WebP de até 8 MB." }, { status: 400 });
    }
    if (!marca || marca.length > 40 || !titulo || titulo.length > 120 || !legenda || legenda.length > 2200) {
      return NextResponse.json({ erro: "Confira marca, título e legenda (até 2.200 caracteres)." }, { status: 400 });
    }
    const resposta = await fetch(`${process.env.POSTEI_MOTOR_URL || "http://127.0.0.1:4710"}/importacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-postei-chave": chave, "x-postei-assinante": user.id, "x-postei-internos": "1" },
      body: JSON.stringify({ marca, titulo, legenda, imagemBase64: Buffer.from(await arquivo.arrayBuffer()).toString("base64") }),
      signal: AbortSignal.timeout(60000),
    });
    const dados = await resposta.json();
    return NextResponse.json(dados, { status: resposta.status });
  } catch {
    return NextResponse.json({ erro: "Não consegui confirmar a importação. Confira o histórico ou tente novamente com a mesma arte e texto; o envio é protegido contra duplicação." }, { status: 503 });
  }
}
