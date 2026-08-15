import type { ReactNode } from "react";
import Link from "next/link";
import { Cabecalho } from "@/components/site/Cabecalho";

/**
 * Tema claro só na vitrine e no cadastro.
 * O painel continua no escuro — os tokens globais não mudam.
 */
export function Venda({
  children,
  barra = false,
}: {
  children: ReactNode;
  barra?: boolean;
}) {
  return (
    <div className={`venda flex min-h-full flex-1 flex-col bg-papel text-tinta ${barra ? "venda--barra" : ""}`}>
      <Cabecalho venda />
      {children}
      {barra && <BarraMobile />}
    </div>
  );
}

export function BarraMobile() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-linha bg-papel/95 p-3 backdrop-blur-md md:hidden">
      <Link
        href="/criar-conta"
        className="flex w-full items-center justify-center rounded-full bg-limao px-5 py-3.5 text-center text-sm font-semibold text-ink"
      >
        Começar grátis — sem cartão
      </Link>
    </div>
  );
}
