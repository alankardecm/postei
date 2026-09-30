"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Publicar } from "@/components/painel/Publicar";
import { PublicarLinkedin } from "@/components/painel/PublicarLinkedin";
import { MidiaPost } from "@/components/painel/MidiaPost";
import type { PublicacaoDoPost } from "@/lib/situacao-publicacao";

/**
 * Revisão do texto antes de publicar.
 *
 * Edita legenda, chamada e hashtags. O TÍTULO não entra: ele está impresso
 * na arte, e mudá-lo exigiria renderizar a imagem de novo — num carrossel,
 * todos os slides. Troca de foto/vídeo fica em MidiaPost (re-render no motor).
 */
export function EditarPost({
  loteId,
  indice,
  conectado,
  conectadoLinkedin = false,
  podeEditar,
  temVideo = false,
  videoPreview = null,
  permiteFoto = true,
  podeGerarReel = false,
  marcaReel = null,
  podePublicarInstagram = true,
  podePublicarLinkedin = false,
  publicacaoIg = null,
  publicacaoLi = null,
  legenda: legendaInicial,
  cta: ctaInicial,
  hashtags: hashtagsIniciais,
}: {
  loteId: string;
  indice: number;
  conectado: boolean;
  conectadoLinkedin?: boolean;
  podeEditar: boolean;
  temVideo?: boolean;
  videoPreview?: string | null;
  permiteFoto?: boolean;
  podeGerarReel?: boolean;
  marcaReel?: "postei" | "am" | "cliente" | null;
  podePublicarInstagram?: boolean;
  podePublicarLinkedin?: boolean;
  publicacaoIg?: PublicacaoDoPost | null;
  publicacaoLi?: PublicacaoDoPost | null;
  legenda: string;
  cta: string | null;
  hashtags: string[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [legenda, setLegenda] = useState(legendaInicial);
  const [cta, setCta] = useState(ctaInicial ?? "");
  const [hashtags, setHashtags] = useState(hashtagsIniciais.map((h) => `#${h}`).join(" "));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const mudou =
    legenda !== legendaInicial ||
    cta !== (ctaInicial ?? "") ||
    hashtags !== hashtagsIniciais.map((h) => `#${h}`).join(" ");

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const resposta = await fetch(`/api/lotes/${encodeURIComponent(loteId)}/posts/${indice}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legenda,
        cta,
        hashtags: hashtags.split(/[\s,]+/).filter(Boolean),
      }),
    });

    setSalvando(false);
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setErro(dados.erro || "Não consegui salvar.");
      return;
    }

    setSalvo(true);
    setEditando(false);
    // Recarrega para o texto exibido refletir o que foi gravado -- e não
    // o que está no estado local, que pode divergir do servidor.
    router.refresh();
  }

  if (!editando) {
    return (
      <div className="flex flex-col gap-3">
        <MidiaPost
          loteId={loteId}
          indice={indice}
          temVideo={temVideo}
          videoPreview={videoPreview}
          permiteFoto={permiteFoto}
          podeGerarReel={podeGerarReel}
          marcaReel={marcaReel}
        />
        <div className="flex flex-wrap items-center gap-3">
          {podePublicarInstagram && (
            <Publicar
              loteId={loteId}
              indice={indice}
              conectado={conectado}
              temVideo={temVideo}
              situacaoInicial={publicacaoIg?.situacao}
              agendadaPara={publicacaoIg?.quando}
              erroInicial={publicacaoIg?.erro}
            />
          )}
          {podePublicarLinkedin && (
            <PublicarLinkedin
              loteId={loteId}
              indice={indice}
              conectado={conectadoLinkedin}
              situacaoInicial={publicacaoLi?.situacao}
              agendadaPara={publicacaoLi?.quando}
              erroInicial={publicacaoLi?.erro}
            />
          )}
          {podeEditar ? (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-full px-3 py-2 text-sm text-cinza transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              Editar texto
            </button>
          ) : (
            <span className="text-sm text-cinza">
              Editar o texto faz parte dos planos pagos.
            </span>
          )}
          {salvo && <span className="text-sm text-folha">Salvo</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-tinta/20 bg-papel p-4">
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Legenda</span>
        <textarea
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          rows={5}
          className="resize-y rounded-lg border border-linha bg-branco px-3 py-2 text-sm outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
        />
        <span className="text-xs text-cinza tabular-nums">
          {legenda.length} caracteres · o Instagram corta em 2.200
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Chamada</span>
        <input
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          className="rounded-lg border border-linha bg-branco px-3 py-2 text-sm outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Hashtags</span>
        <textarea
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          rows={2}
          className="resize-y rounded-lg border border-linha bg-branco px-3 py-2 font-mono text-xs outline-none focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
        />
      </label>

      <p className="text-xs text-cinza">
        O título fica na imagem e não pode ser editado aqui — para mudá-lo, gere o pacote de novo.
      </p>

      {erro && (
        <p role="alert" className="rounded-lg bg-ink px-3 py-2 text-xs text-tinta">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !mudou}
          className="rounded-full bg-limao px-4 py-2 text-sm font-medium text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setLegenda(legendaInicial);
            setCta(ctaInicial ?? "");
            setHashtags(hashtagsIniciais.map((h) => `#${h}`).join(" "));
            setEditando(false);
            setErro(null);
          }}
          disabled={salvando}
          className="rounded-full px-4 py-2 text-sm text-cinza hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
