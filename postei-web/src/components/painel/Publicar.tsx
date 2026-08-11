"use client";

import { useState } from "react";

type Situacao = "parado" | "publicando" | "publicado" | "agendado" | "erro";
type Modo = "feed" | "reels";

export function Publicar({
  loteId,
  indice,
  conectado,
  temVideo = false,
}: {
  loteId: string;
  indice: number;
  conectado: boolean;
  /** Se true, mostra a opção de publicar como Reel (MP4 anexado). */
  temVideo?: boolean;
}) {
  const [situacao, setSituacao] = useState<Situacao>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [modoConfirm, setModoConfirm] = useState<Modo>("feed");
  const [agendando, setAgendando] = useState(false);
  const [quando, setQuando] = useState(sugestaoDeHorario());

  async function publicar(modo: Modo = "feed") {
    setSituacao("publicando");
    setErro(null);

    const resposta = await fetch("/api/instagram/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loteId, indice, modo }),
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

  async function agendar() {
    setSituacao("publicando");
    setErro(null);

    const resposta = await fetch("/api/instagram/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // O input devolve horário local; o servidor guarda em UTC.
      body: JSON.stringify({ loteId, indice, quando: new Date(quando).toISOString() }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setSituacao("erro");
      setErro(dados.erro || "Não consegui agendar.");
      return;
    }
    setSituacao("agendado");
    setAgendando(false);
  }

  if (situacao === "agendado") {
    return (
      <p className="rounded-full bg-areia px-4 py-2 text-center text-sm font-medium text-tinta">
        Agendado para {new Date(quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>
    );
  }

  if (situacao === "publicado") {
    return (
      <p className="rounded-full bg-limao px-4 py-2 text-center text-sm font-medium text-tinta">
        Publicado no Instagram{modoConfirm === "reels" ? " (Reel)" : ""}
      </p>
    );
  }

  if (agendando) {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Publicar em</span>
          <input
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            className="rounded-lg border border-linha bg-branco px-3 py-2 text-sm outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={agendar}
            disabled={situacao === "publicando"}
            className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-papel disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {situacao === "publicando" ? "Agendando…" : "Confirmar agendamento"}
          </button>
          <button
            type="button"
            onClick={() => setAgendando(false)}
            className="rounded-full px-4 py-2 text-sm text-cinza hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Cancelar
          </button>
        </div>
        {erro && (
          <p role="alert" className="rounded-xl bg-tinta px-3 py-2 text-xs text-papel">
            {erro}
          </p>
        )}
      </div>
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
            onClick={() => void publicar(modoConfirm)}
            disabled={situacao === "publicando"}
            className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-papel disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {situacao === "publicando"
              ? "Publicando…"
              : modoConfirm === "reels"
                ? "Confirmar Reel"
                : "Confirmar publicação"}
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setModoConfirm("feed");
              setConfirmando(true);
            }}
            className="rounded-full border border-tinta px-4 py-2 text-sm font-medium transition-colors hover:bg-tinta hover:text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Publicar agora
          </button>
          {temVideo && (
            <button
              type="button"
              onClick={() => {
                setModoConfirm("reels");
                setConfirmando(true);
              }}
              className="rounded-full border border-folha px-4 py-2 text-sm font-medium text-folha transition-colors hover:bg-folha hover:text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              Publicar como Reel
            </button>
          )}
          <button
            type="button"
            onClick={() => setAgendando(true)}
            className="rounded-full border border-linha px-4 py-2 text-sm transition-colors hover:border-tinta/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            Agendar
          </button>
        </div>
      )}

      {erro && (
        <p role="alert" className="rounded-xl bg-tinta px-3 py-2 text-xs text-papel">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Sugere amanhã às 9h — horário plausível, e o campo já vem preenchido. */
function sugestaoDeHorario() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  // O input datetime-local espera horário LOCAL sem fuso, não ISO em UTC.
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
