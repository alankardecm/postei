import { Cabecalho } from "@/components/site/Cabecalho";
import { FormularioAcesso } from "@/components/site/FormularioAcesso";

export const metadata = { title: "Entrar — Postei" };

// No Next 16 searchParams e assincrono.
export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { de } = await searchParams;
  const destino = typeof de === "string" ? de : undefined;

  return (
    <>
      <Cabecalho />
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="w-full max-w-sm">
          <h1 className="fonte-display text-3xl font-extrabold tracking-tight">Entrar</h1>
          <p className="mt-2 mb-8 text-cinza">Bom te ver de volta.</p>
          <FormularioAcesso modo="entrar" destino={destino} />
        </div>
      </main>
    </>
  );
}
