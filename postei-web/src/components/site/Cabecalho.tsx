import Link from "next/link";

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-50 border-b border-linha bg-papel/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Postei, página inicial">
          <span className="h-6 w-1.5 rounded-full bg-limao" aria-hidden="true" />
          <span className="fonte-display text-xl font-bold tracking-tight">Postei</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-cinza md:flex">
          <a href="#nichos" className="transition-colors hover:text-tinta">Nichos</a>
          <a href="#como" className="transition-colors hover:text-tinta">Como funciona</a>
          <a href="#planos" className="transition-colors hover:text-tinta">Planos</a>
          <a href="#perguntas" className="transition-colors hover:text-tinta">Dúvidas</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/entrar"
            className="rounded-full px-3.5 py-2 text-sm text-cinza transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-papel transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}
