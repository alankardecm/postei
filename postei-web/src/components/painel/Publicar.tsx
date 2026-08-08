"use client";

import { useState } from "react";

type Situacao = "parado" | "publicando" | "publicado" | "erro";

export function Publicar({
  loteId,
  indice,
  conectado,
}: {
  loteId: string;
  indice: number;
  conectado: boolean;
}) {
  const [situacao, setSituacao] = useState<Situacao>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  async function publicar() {
    setSituacao("publicando");
    setErro(null);

    const resposta = await fetch("/api/instagram/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loteId, indice }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setSituacao("erro");
      setErro(dados.erro || "Não consegui publicar.");
      setConfirmando(false);
      return;
    }
    setSituacao("publicado");
  }

  if (!conectado) {
    return (
      <p className="text-sm text-cinza">
        Conecte seu Instagram para publicar daqui.
      </p>
    );
  }

  if (situacao === "publicado") {
    return (
      <p className="rounded-full bg-limao px-4 py-2 text-center text-sm font-medium text-tinta">
        Publicado no Instagram
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {confirmando ? (
        // Publicar é irreversível pelo painel: uma vez no ar, só o Instagram
        // apaga. Por isso o segundo clique.
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={publicar}
            disabled={situacao === "publicando"}
            className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-papel disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {situacao === "publicando" ? "Publicando…" : "Confirmar publicação"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={situacao === "publicando"}
            className="rounded-full px-4 py-2 text-sm text-cinza hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="rounded-full border border-tinta px-4 py-2 text-sm font-medium transition-colors hover:bg-tinta hover:text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          Publicar no Instagram
        </button>
      )}

      {erro && (
        <p role="alert" className="rounded-xl bg-tinta px-3 py-2 text-xs text-papel">
          {erro}
        </p>
      )}
    </div>
  );
}
