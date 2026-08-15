import { Venda } from "@/components/site/Venda";
import { PedirRecuperacao } from "@/components/site/PedirRecuperacao";

export const metadata = { title: "Recuperar senha — Postei" };

export default function EsqueciSenha() {
  return (
    <Venda>
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-sm">
          <h1 className="fonte-display text-3xl font-extrabold tracking-tight">
            Recuperar senha
          </h1>
          <p className="mt-2 mb-8 text-cinza">
            Informe o e-mail da sua conta. Você recebe um link para criar uma nova senha.
          </p>
          <PedirRecuperacao />
        </div>
      </main>
    </Venda>
  );
}
