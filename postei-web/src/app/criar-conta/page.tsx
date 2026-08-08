import { Cabecalho } from "@/components/site/Cabecalho";
import { FormularioAcesso } from "@/components/site/FormularioAcesso";

export const metadata = { title: "Criar conta — Postei" };

export default function CriarConta() {
  return (
    <>
      <Cabecalho />
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-sm">
          <h1 className="fonte-display text-3xl font-extrabold tracking-tight">Criar conta</h1>
          <p className="mt-2 mb-8 text-cinza">
            Leva um minuto. Sem cartão e sem compromisso.
          </p>
          <FormularioAcesso modo="criar" />
        </div>
      </main>
    </>
  );
}
