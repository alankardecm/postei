import { Cabecalho } from "@/components/site/Cabecalho";
import { DefinirSenha } from "@/components/site/DefinirSenha";

export const metadata = { title: "Nova senha — Postei" };

export default function NovaSenha() {
  return (
    <>
      <Cabecalho />
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-sm">
          <h1 className="fonte-display text-3xl font-extrabold tracking-tight">Nova senha</h1>
          <p className="mt-2 mb-8 text-cinza">Escolha uma senha e você já entra na conta.</p>
          <DefinirSenha />
        </div>
      </main>
    </>
  );
}
