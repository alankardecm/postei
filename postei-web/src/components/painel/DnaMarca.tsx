"use client";

import { useEffect, useState } from "react";
import { problemaDaPaleta, normalizarHex, aproximarLegivel, HEX } from "@/lib/paleta";

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

const CORES = [
  { id: "cor_fundo", rotulo: "Fundo", padrao: "#161B33" },
  { id: "cor_texto", rotulo: "Texto", padrao: "#F5EFE2" },
  { id: "cor_destaque", rotulo: "Destaque", padrao: "#E0B15C" },
] as const;

type Campo = (typeof CAMPOS)[number]["id"];
type Cor = (typeof CORES)[number]["id"];
type Dna = Partial<Record<Campo | Cor, string>>;

/** A arte em miniatura, com as cores escolhidas. Espelha `moldura()` do
 *  motor: fundo, título, barra de destaque e assinatura da marca. */
function Previa({ fundo, texto, destaque, marca }: Record<string, string>) {
  return (
    <div
      className="flex aspect-square w-40 shrink-0 flex-col justify-between rounded-xl p-4"
      style={{ backgroundColor: fundo }}
    >
      <span style={{ color: destaque, fontSize: 11, fontWeight: 700 }}>“</span>
      <span style={{ color: texto, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
        O lanche das 16h que sabota seu jantar
      </span>
      <span className="flex flex-col gap-1.5">
        <span style={{ backgroundColor: destaque, height: 3, width: 28, borderRadius: 2 }} />
        <span style={{ color: texto, opacity: 0.75, fontSize: 10 }}>{marca}</span>
      </span>
    </div>
  );
}

export function DnaMarca({ marcas }: { marcas: string[] }) {
  const [marca, setMarca] = useState(marcas[0] ?? "");
  const [dna, setDna] = useState<Dna>({});
  const [carregando, setCarregando] = useState(Boolean(marcas[0]));
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!marca) return;
    let ativo = true;
    fetch(`/api/marcas/dna?marca=${encodeURIComponent(marca)}`)
      .then((r) => r.json())
      .then((d) => { if (ativo) setDna(d.dna ?? {}); })
      .catch(() => { if (ativo) setAviso("Não consegui carregar."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
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

  // Avisa enquanto a pessoa escolhe; o servidor confere de novo ao gravar.
  const problema = problemaDaPaleta({
    fundo: dna.cor_fundo || undefined,
    texto: dna.cor_texto || undefined,
    destaque: dna.cor_destaque || undefined,
  });

  // O ajuste automático só faz sentido quando as três cores são válidas e o
  // problema é de contraste. Hex mal digitado a pessoa corrige na mão.
  const podeAjustar =
    Boolean(problema) &&
    [dna.cor_fundo, dna.cor_texto, dna.cor_destaque].every((c) => HEX.test(String(c ?? "")));

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
            onChange={(e) => { setMarca(e.target.value); setCarregando(true); setAviso(null); }}
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

        <div className="mt-2 border-t border-linha pt-4">
          <span className="rotulo">Cores da marca</span>
          <p className="mt-1 mb-3 max-w-xl text-sm text-cinza">
            Sem isto, todo mundo do mesmo ramo recebe a arte na mesma cor. Deixe em branco
            para usar a paleta padrão do nicho.
          </p>

          <div className="flex flex-wrap items-start gap-5">
            <Previa
              fundo={HEX.test(String(dna.cor_fundo ?? "")) ? dna.cor_fundo! : "#161B33"}
              texto={HEX.test(String(dna.cor_texto ?? "")) ? dna.cor_texto! : "#F5EFE2"}
              destaque={HEX.test(String(dna.cor_destaque ?? "")) ? dna.cor_destaque! : "#E0B15C"}
              marca={marca}
            />

            <div className="flex flex-col gap-3">
              {CORES.map((cor) => (
                <label key={cor.id} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={HEX.test(String(dna[cor.id] ?? "")) ? dna[cor.id]! : cor.padrao}
                    onChange={(e) => setDna((d) => ({ ...d, [cor.id]: e.target.value }))}
                    className="h-9 w-14 cursor-pointer rounded border border-linha bg-branco"
                  />
                  <span className="w-20 text-sm">{cor.rotulo}</span>
                  {/* Campo de texto além do seletor: quem já tem marca recebe
                      o código pronto da designer e precisa poder colar. */}
                  <input
                    type="text"
                    value={dna[cor.id] ?? ""}
                    onChange={(e) => {
                      const bruto = e.target.value;
                      const hex = normalizarHex(bruto);
                      setDna((d) => ({ ...d, [cor.id]: hex ?? bruto }));
                    }}
                    placeholder={cor.padrao}
                    spellCheck={false}
                    className="w-28 rounded border border-linha bg-papel px-2 py-1.5 font-mono text-xs uppercase outline-none focus:border-folha"
                  />
                </label>
              ))}

              <button
                type="button"
                onClick={() =>
                  setDna((d) => ({ ...d, cor_fundo: "", cor_texto: "", cor_destaque: "" }))
                }
                className="self-start text-sm text-cinza underline underline-offset-4 hover:text-tinta"
              >
                Voltar à paleta do nicho
              </button>
            </div>
          </div>

          {problema && (
            <div role="alert" className="mt-3 rounded-lg bg-areia px-3 py-2.5 text-sm text-ink">
              <p>{problema}</p>
              {podeAjustar && (
                <>
                  <p className="mt-1 text-cinza">
                    Se essa é mesmo a paleta da sua marca, eu clareio ou escureço só o
                    necessário — o matiz continua o seu, e o fundo não muda.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDna((d) => ({
                        ...d,
                        cor_texto: aproximarLegivel(d.cor_texto!, d.cor_fundo!),
                        cor_destaque: aproximarLegivel(d.cor_destaque!, d.cor_fundo!),
                      }))
                    }
                    className="mt-2 rounded-full border border-tinta/25 px-3 py-1.5 text-sm transition-colors hover:border-tinta/60"
                  >
                    Ajustar para ficar legível
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || carregando || Boolean(problema)}
            className="rounded-full bg-limao px-4 py-2 text-sm font-medium text-ink disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
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
