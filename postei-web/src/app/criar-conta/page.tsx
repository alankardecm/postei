import { Venda } from "@/components/site/Venda";
import { FormularioAcesso } from "@/components/site/FormularioAcesso";

export const metadata = { title: "Criar conta — Postei" };

export default function CriarConta() {
  return (
    <Venda>
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-sm">
          <h1 className="fonte-display text-3xl font-extrabold tracking-tight">Começar grátis</h1>
          <p className="mt-2 mb-8 text-cinza">
            Leva um minuto. Sem cartão. 2 posts de teste.
          </p>
          <FormularioAcesso modo="criar" />
        </div>
      </main>
    </Venda>
  );
}
