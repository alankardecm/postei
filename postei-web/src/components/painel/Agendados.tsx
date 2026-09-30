"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Agendado = {
  id: string;
  lote_id: string;
  indice: number;
  agendada_para: string;
  situacao: string;
  erro: string | null;
  rede?: "instagram" | "linkedin";
};

export function Agendados({ itens }: { itens: Agendado[] }) {
  const router = useRouter();
  const [cancelando, setCancelando] = useState<string | null>(null);

  if (itens.length === 0) return null;

  async function cancelar(id: string) {
    setCancelando(id);
    const item = itens.find((i) => i.id === id);
    const rota = item?.rede === "linkedin" ? "/api/linkedin/agendar" : "/api/instagram/agendar";
    await fetch(`${rota}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setCancelando(null);
    router.refresh();
  }

  return (
    <section className="mt-12">
      <h2 className="rotulo mb-4">Na fila · {itens.length}</h2>

      <ul className="flex flex-col gap-3">
        {itens.map((item) => {
          const falhou = item.situacao === "falhou";
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-linha bg-branco p-4"
            >
              <div className="min-w-0">
                <p className="font-medium tabular-nums">
                  {new Date(item.agendada_para).toLocaleString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="truncate text-sm text-cinza">
                  {item.rede === "linkedin" ? "LinkedIn" : "Instagram"} · post {item.indice + 1} ·{" "}
                  {item.lote_id.split("_")[0]}
                </p>
                {falhou && item.erro && (
                  <p className="mt-1 text-sm text-tinta">{item.erro}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider ${
                    falhou ? "bg-ink text-tinta" : "bg-areia text-ink"
                  }`}
                >
                  {falhou ? "falhou" : item.situacao}
                </span>
                {item.situacao === "agendada" && (
                  <button
                    type="button"
                    onClick={() => cancelar(item.id)}
                    disabled={cancelando === item.id}
                    className="rounded-full border border-tinta/20 px-3 py-1.5 text-sm transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
                  >
                    {cancelando === item.id ? "…" : "Cancelar"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
