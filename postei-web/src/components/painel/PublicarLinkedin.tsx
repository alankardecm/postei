"use client";

import { useState } from "react";

type Situacao = "parado" | "publicando" | "publicado" | "agendado" | "erro";

export function PublicarLinkedin({
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
  const [agendando, setAgendando] = useState(false);
  const [quando, setQuando] = useState(sugestaoDeHorario());

  if (!conectado) {
    return (
      <p className="text-sm text-cinza">
        Conecte seu LinkedIn no painel para publicar daqui.
      </p>
    );
  }

  async function publicar() {
    setSituacao("publicando");
    setErro(null);
    const resposta = await fetch("/api/linkedin/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loteId, indice }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      setSituacao("erro");
      setErro(dados.erro || "Não consegui publicar no LinkedIn.");
      setConfirmando(false);
      return;
    }
    setSituacao("publicado");
  }

  async function agendar() {
    setSituacao("publicando");
    setErro(null);
    const resposta = await fetch("/api/linkedin/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      <p className="rounded-full bg-areia px-4 py-2 text-center text-sm font-medium text-ink">
        LinkedIn: agendado para{" "}
        {new Date(quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>
    );
  }

  if (situacao === "publicado") {
    return (
      <p className="rounded-full bg-limao px-4 py-2 text-center text-sm font-medium text-ink">
        Publicado no LinkedIn
      </p>
    );
  }

  if (agendando) {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Publicar no LinkedIn em</span>
          <input
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            className="rounded-lg border border-linha bg-branco px-3 py-2 text-sm outline-none focus:border-folha"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={agendar}
            disabled={situacao === "publicando"}
            className="rounded-full bg-limao px-4 py-2 text-sm font-medium text-ink disabled:opacity-55"
          >
            {situacao === "publicando" ? "Agendando…" : "Confirmar agendamento"}
          </button>
          <button type="button" onClick={() => setAgendando(false)} className="rounded-full px-4 py-2 text-sm text-cinza">
            Cancelar
          </button>
        </div>
        {erro && <p role="alert" className="rounded-xl bg-ink px-3 py-2 text-xs text-[#F2F4EE]">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {confirmando ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void publicar()}
            disabled={situacao === "publicando"}
            className="rounded-full bg-limao px-4 py-2 text-sm font-medium text-ink disabled:opacity-55"
          >
            {situacao === "publicando" ? "Publicando…" : "Confirmar no LinkedIn"}
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="rounded-full px-4 py-2 text-sm text-cinza">
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="rounded-full border border-tinta px-4 py-2 text-sm font-medium hover:bg-limao hover:text-ink"
          >
            Publicar no LinkedIn
          </button>
          <button
            type="button"
            onClick={() => setAgendando(true)}
            className="rounded-full border border-linha px-4 py-2 text-sm hover:border-tinta/50"
          >
            Agendar LinkedIn
          </button>
        </div>
      )}
      {erro && <p role="alert" className="rounded-xl bg-ink px-3 py-2 text-xs text-[#F2F4EE]">{erro}</p>}
    </div>
  );
}

function sugestaoDeHorario() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
