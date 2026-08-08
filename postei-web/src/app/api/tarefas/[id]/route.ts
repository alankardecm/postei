import { NextResponse } from "next/server";
import { motor, usuarioAtual, ErroMotor } from "@/lib/motor";

// No Next 16 os params de rota são assíncronos.
export async function GET(_request: Request, { params }: RouteContext<"/api/tarefas/[id]">) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await params;
  try {
    return NextResponse.json(await motor.tarefa(user.id, id));
  } catch (erro) {
    const e = erro as ErroMotor;
    return NextResponse.json({ erro: e.message }, { status: e.status || 500 });
  }
}
