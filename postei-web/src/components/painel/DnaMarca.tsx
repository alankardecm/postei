"use client";

import { useEffect, useState } from "react";

/**
 * O DNA da marca: quem assina os posts.
 *
 * Sete campos, todos opcionais. Quem não preenche continua gerando com o
 * perfil padrão do nicho — a tela não pode virar pedágio para usar o produto.
 */

const CAMPOS = [
  {
    id: "quem",
    rotulo: "Quem é você",
    dica: "Nome, formação e o que você faz. Ex.: nutricionista, atendo mulheres em pós-parto há 4 anos.",
    linhas: 2,
  },
  {
    id: "publico",
    rotulo: "Para quem você fala",
    dica: "Quem te segue e o que essa pessoa está vivendo agora.",
    linhas: 2,
  },
  {
    id: "metodo",
    rotulo: "Seu método",
    dica: "Como você trabalha, no que acredita, o que faz diferente de quem é da mesma área.",
    linhas: 3,
  },
  {
    id: "diferenciais",
    rotulo: "Seus diferenciais",
    dica: "O que só você diria. Uma opinião, uma abordagem, uma bandeira.",
    linhas: 2,
  },
  {
    id: "nao_aborda",
    rotulo: "Assuntos que você NÃO aborda",
    dica: "O mais importante da lista. Nenhum post vai tocar nesses temas.",
    linhas: 2,
  },
  {
    id: "ofertas",
    rotulo: "O que você vende",
    dica: "Serviços, consultas, cursos. Serve para a chamada final fazer sentido.",
    linhas: 2,
  },
  {
    id: "tom",
    rotulo: "Seu tom de voz",
    dica: "Ex.: direto e sem rodeio; ou acolhedor, primeira pessoa, sem jargão.",
    linhas: 2,
  },
] as const;

type Campo = (typeof CAMPOS)[number]["id"];
type Dna = Partial<Record<Campo, string>>;

export function DnaMarca({ marcas }: { marcas: string[] }) {
  const [marca, setMarca] = useState(marcas[0] ?? "");
  const [dna, setDna] = useState<Dna>({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!marca) return;
    setCarregando(true);
    setAviso(null);
    fetch(`/api/marcas/dna?marca=${encodeURIComponent(marca)}`)
      .then((r) => r.json())
      .then((d) => setDna(d.dna ?? {}))
      .catch(() => setAviso("Não consegui carregar."))
      .finally(() => setCarregando(false));
  }, [marca]);

  async function salvar() {
    setSalvando(true);
    setAviso(null);

    const resposta = await fetch("/api/marcas/dna", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marca, ...dna }),
    });

    setSalvando(false);
    const dados = await resposta.json().catch(() => ({}));
    setAviso(resposta.ok ? "Salvo. Vale a partir do próximo pacote." : dados.erro || "Não consegui salvar.");
  }

  if (marcas.length === 0) return null;

  const preenchidos = CAMPOS.filter((c) => String(dna[c.id] ?? "").trim()).length;

  return (
    <section className="mt-12">
      <h2 className="rotulo mb-1">DNA da marca</h2>
      <p className="mb-4 max-w-2xl text-sm text-cinza">
        O nicho define o assunto; isto define <strong className="font-medium text-tinta">quem está falando</strong>.
        Sem ele o texto sai correto e genérico — parecido com o de qualquer concorrente da sua área.
        Tudo é opcional, e cada campo preenchido deixa os posts mais seus.
      </p>

      {marcas.length > 1 && (
        <label className="mb-4 flex flex-col gap-1.5">
          <span className="rotulo">Marca</span>
          <select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className="max-w-sm rounded-lg border border-linha bg-branco px-3 py-2 text-sm"
          >
            {marcas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-linha bg-branco p-5">
        {CAMPOS.map((campo) => (
          <label key={campo.id} className="flex flex-col gap-1.5">
            <span className="rotulo">{campo.rotulo}</span>
            <textarea
              value={dna[campo.id] ?? ""}
              onChange={(e) => setDna((d) => ({ ...d, [campo.id]: e.target.value }))}
              rows={campo.linhas}
              disabled={carregando}
              maxLength={600}
              placeholder={campo.dica}
              className="resize-y rounded-lg border border-linha bg-papel px-3 py-2 text-sm outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha disabled:opacity-60"
            />
          </label>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || carregando}
            className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-papel disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {salvando ? "Salvando…" : "Salvar DNA"}
          </button>
          <span className="text-sm text-cinza tabular-nums">
            {preenchidos} de {CAMPOS.length} campos
          </span>
          {aviso && <span className="text-sm text-folha">{aviso}</span>}
        </div>
      </div>
    </section>
  );
}
