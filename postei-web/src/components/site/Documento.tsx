import type { ReactNode } from "react";

/** Moldura comum dos documentos legais: coluna estreita e leitura confortável. */
export function Documento({
  titulo,
  atualizado,
  children,
}: {
  titulo: string;
  atualizado: string;
  children: ReactNode;
}) {
  return (
    <main className="flex-1 px-5 py-14 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <p className="rotulo mb-3">Atualizado em {atualizado}</p>
        <h1 className="fonte-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.05] tracking-[-.03em] text-balance">
          {titulo}
        </h1>
        <div className="mt-8 flex flex-col gap-6 leading-relaxed text-cinza [&_a]:text-folha [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-tinta">
          {children}
        </div>
      </article>
    </main>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-linha pt-6">
      <h2 className="fonte-display text-xl font-bold tracking-tight text-tinta">{titulo}</h2>
      {children}
    </section>
  );
}

export function Tabela({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return (
    // Tabela em coluna estreita precisa poder rolar sozinha, senão empurra a
    // página inteira para o lado no celular.
    <div className="overflow-x-auto rounded-xl border border-linha">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="bg-branco">
            {colunas.map((c) => (
              <th
                key={c}
                scope="col"
                className="rotulo border-b border-linha px-4 py-3 text-left"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha[0]} className="border-b border-linha last:border-0">
              {linha.map((celula, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 align-top ${i === 0 ? "font-medium text-tinta" : ""}`}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
