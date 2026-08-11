"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Os slides de um carrossel, com visualização ampliada sobre a página.
 *
 * Abrir em aba nova tirava a pessoa da revisão: para comparar o slide 3 com
 * o 4 ela teria que ir e voltar duas vezes. Aqui a ampliação acontece por
 * cima, com as setas para andar entre os slides sem fechar.
 */
export function SlidesCarrossel({
  loteId,
  arquivos,
  cacheBust,
}: {
  loteId: string;
  arquivos: string[];
  /** Quebra cache do browser após trocar a foto da capa. */
  cacheBust?: string | null;
}) {
  const [aberto, setAberto] = useState<number | null>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  const url = (arquivo: string) => {
    const base = `/api/lotes/${encodeURIComponent(loteId)}/imagem/${encodeURIComponent(arquivo)}`;
    return cacheBust ? `${base}?t=${encodeURIComponent(cacheBust)}` : base;
  };

  const andar = useCallback(
    (passo: number) =>
      setAberto((i) => (i === null ? i : (i + passo + arquivos.length) % arquivos.length)),
    [arquivos.length],
  );

  useEffect(() => {
    if (aberto === null) return;

    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(null);
      if (e.key === "ArrowRight") andar(1);
      if (e.key === "ArrowLeft") andar(-1);
    }

    window.addEventListener("keydown", tecla);
    // Trava a rolagem do fundo: sem isso a página corre atrás do overlay.
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [aberto, andar]);

  return (
    <>
      <span className="rotulo">Os {arquivos.length} slides, na ordem</span>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {arquivos.map((arquivo, s) => (
          <button
            key={arquivo}
            type="button"
            onClick={() => setAberto(s)}
            className="group relative shrink-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            aria-label={`Ampliar slide ${s + 1} de ${arquivos.length}`}
          >
            <Image
              src={url(arquivo)}
              alt=""
              width={1080}
              height={1350}
              className="h-auto w-40 rounded-lg border border-linha transition-colors group-hover:border-folha"
              unoptimized
            />
            <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[.68rem] font-medium text-tinta tabular-nums">
              {s + 1}/{arquivos.length}
            </span>
          </button>
        ))}
      </div>

      {aberto !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Slide ${aberto + 1} de ${arquivos.length}`}
          // Clicar no fundo fecha; o clique na imagem não sobe até aqui.
          onClick={() => setAberto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
        >
          <button
            ref={fecharRef}
            type="button"
            onClick={() => setAberto(null)}
            className="absolute right-4 top-4 rounded-full bg-tinta/15 px-3 py-1.5 text-sm text-tinta hover:bg-tinta/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
          >
            Fechar ✕
          </button>

          {arquivos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  andar(-1);
                }}
                aria-label="Slide anterior"
                className="absolute left-3 rounded-full bg-tinta/15 px-3 py-4 text-tinta hover:bg-tinta/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  andar(1);
                }}
                aria-label="Próximo slide"
                className="absolute right-3 rounded-full bg-tinta/15 px-3 py-4 text-tinta hover:bg-tinta/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
              >
                ›
              </button>
            </>
          )}

          <figure onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
            <Image
              src={url(arquivos[aberto])}
              alt={`Slide ${aberto + 1}`}
              width={1080}
              height={1350}
              className="max-h-[80vh] w-auto rounded-xl"
              unoptimized
            />
            <figcaption className="text-sm text-tinta/80 tabular-nums">
              {aberto + 1} de {arquivos.length} · use ← → para navegar, Esc para fechar
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
