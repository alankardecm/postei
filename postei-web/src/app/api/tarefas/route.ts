import { NextResponse } from "next/server";
import { motor, usuarioAtual, ErroMotor } from "@/lib/motor";
import { reservar, devolver, SemCota } from "@/lib/cota";

/** Enfileira uma geração para o usuário da sessão. */
export async function POST(request: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const nicho = typeof corpo?.nicho === "string" ? corpo.nicho : "";
  const marca = typeof corpo?.marca === "string" ? corpo.marca.trim() : "";
  const quantidade = Number(corpo?.quantidade) || 10;

  if (!nicho || !marca) {
    return NextResponse.json({ erro: "Escolha o nicho e informe o nome do perfil." }, { status: 400 });
  }
  if (marca.length > 40) {
    return NextResponse.json({ erro: "O nome do perfil está muito longo." }, { status: 400 });
  }

  // Reserva a cota ANTES de enfileirar. Se reservasse depois, duas
  // requisições simultâneas passariam pelo limite e o provedor cobraria as
  // duas — a cota existe justamente para isso não acontecer.
  let reserva;
  try {
    reserva = await reservar({ usuarioId: user.id, posts: quantidade, marca });
  } catch (erro) {
    if (erro instanceof SemCota) {
      return NextResponse.json({ erro: erro.message }, { status: 402 });
    }
    throw erro;
  }

  try {
    // O assinante vem da SESSÃO, nunca do corpo da requisição.
    const tarefa = await motor.criarTarefa(user.id, { nicho, marca, quantidade });
    return NextResponse.json({ ...tarefa, restantes: reserva.restantes }, { status: 202 });
  } catch (erro) {
    // A geração não começou: devolver o que foi reservado, senão o assinante
    // perde cota por uma falha que não é dele.
    await devolver(user.id, reserva.ciclo, quantidade);
    const e = erro as ErroMotor;
    return NextResponse.json({ erro: e.message }, { status: e.status || 500 });
  }
}
