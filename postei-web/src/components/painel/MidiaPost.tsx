"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Troca de foto (Pexels / upload) e Reel (Ken Burns do cliente ou Imagine da marca).
 * A prévia não sobe no Instagram até o assinante aceitar.
 */
export function MidiaPost({
  loteId,
  indice,
  temVideo,
  videoPreview = null,
  permiteFoto = true,
  podeGerarReel = false,
  marcaReel = null,
}: {
  loteId: string;
  indice: number;
  temVideo: boolean;
  videoPreview?: string | null;
  permiteFoto?: boolean;
  podeGerarReel?: boolean;
  marcaReel?: "postei" | "am" | "cliente" | null;
}) {
  const router = useRouter();
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputVideo = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState<
    "pexels" | "foto" | "video" | "reel" | "aceitar" | "recusar" | null
  >(null);
  const [segundosReel, setSegundosReel] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function pexels() {
    setOcupado("pexels");
    setErro(null);
    setOk(null);
    try {
      const form = new FormData();
      form.set("fonte", "pexels");
      const r = await fetch(
        `/api/lotes/${encodeURIComponent(loteId)}/posts/${indice}/arte`,
        { method: "POST", body: form },
      );
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(dados.erro || "Não consegui buscar outra foto.");
        return;
      }
      setOk("Arte atualizada com outra foto do banco.");
      router.refresh();
    } catch {
      setErro("Falha de rede ao refazer a arte.");
    } finally {
      setOcupado(null);
    }
  }

  async function enviarFoto(file: File) {
    setOcupado("foto");
    setErro(null);
    setOk(null);
    try {
      const form = new FormData();
      form.set("fonte", "upload");
      form.set("arquivo", file);
      const r = await fetch(
        `/api/lotes/${encodeURIComponent(loteId)}/posts/${indice}/arte`,
        { method: "POST", body: form },
      );
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(dados.erro || "Não consegui usar essa foto.");
        return;
      }
      setOk("Arte refeita com a sua foto.");
      router.refresh();
    } catch {
      setErro("Falha de rede ao enviar a foto.");
    } finally {
      setOcupado(null);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  async function enviarVideo(file: File) {
    setOcupado("video");
    setErro(null);
    setOk(null);
    try {
      const form = new FormData();
      form.set("arquivo", file);
      const r = await fetch(
        `/api/lotes/${encodeURIComponent(loteId)}/posts/${indice}/video`,
        { method: "POST", body: form },
      );
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(dados.erro || "Não consegui guardar o vídeo.");
        return;
      }
      setOk("Vídeo anexado. Você pode publicar como Reel.");
      router.refresh();
    } catch {
      setErro("Falha de rede ao enviar o vídeo.");
    } finally {
      setOcupado(null);
      if (inputVideo.current) inputVideo.current.value = "";
    }
  }

  async function gerarReel() {
    setOcupado("reel");
    setSegundosReel(0);
    setErro(null);
    setOk(null);
    const tick = setInterval(() => setSegundosReel((s) => s + 1), 1000);
    try {
      const r = await fetch(
        `/api/lotes/${encodeURIComponent(loteId)}/posts/${indice}/reel`,
        { method: "POST" },
      );
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(dados.erro || "Não consegui gerar o Reel.");
        return;
      }
      setOk("Prévia pronta. Assista e decida se sobe.");
      router.refresh();
    } catch {
      setErro("Falha de rede ao gerar o Reel.");
    } finally {
      clearInterval(tick);
      setOcupado(null);
    }
  }

  async function decidir(acao: "aceitar" | "recusar") {
    setOcupado(acao);
    setErro(null);
    setOk(null);
    try {
      const r = await fetch(
        `/api/lotes/${encodeURIComponent(loteId)}/posts/${indice}/reel/decisao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao }),
        },
      );
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(dados.erro || "Não consegui guardar a decisão.");
        return;
      }
      setOk(acao === "aceitar" ? "Reel aceito. Pode publicar." : "Prévia descartada.");
      router.refresh();
    } catch {
      setErro("Falha de rede ao guardar a decisão.");
    } finally {
      setOcupado(null);
    }
  }

  const busy = ocupado !== null;
  const temPreview = Boolean(videoPreview);
  const dicaReel =
    marcaReel === "am"
      ? "O apresentador da AM fala o texto deste post (~10 s)."
      : marcaReel === "postei"
        ? "Anima o anúncio com câmera lenta. Texto e logo ficam parados (~6 s)."
        : "Anima o post com câmera lenta (~8 s). Você assiste e só sobe se gostar.";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-linha bg-papel px-3 py-3">
      <span className="rotulo">Mídia</span>
      <div className="flex flex-wrap gap-2">
        {permiteFoto && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void pexels()}
            className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {ocupado === "pexels" ? "Buscando…" : "Outra foto (banco)"}
          </button>
        )}

        {permiteFoto && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputFoto.current?.click()}
            className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {ocupado === "foto" ? "Aplicando…" : "Enviar minha foto"}
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => inputVideo.current?.click()}
          className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {ocupado === "video" ? "Enviando…" : temVideo ? "Trocar vídeo (MP4)" : "Anexar vídeo (MP4)"}
        </button>

        {podeGerarReel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void gerarReel()}
            className="rounded-full border border-limao bg-limao px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-limao disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
          >
            {ocupado === "reel"
              ? `Gerando prévia… ${segundosReel}s`
              : temPreview
                ? "Gerar outra prévia"
                : temVideo
                  ? "Gerar outro Reel"
                  : "Gerar Reel"}
          </button>
        )}
      </div>

      <input
        ref={inputFoto}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviarFoto(f);
        }}
      />
      <input
        ref={inputVideo}
        type="file"
        accept="video/mp4,video/quicktime,.mp4"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviarVideo(f);
        }}
      />

      {temPreview && videoPreview && (
        <div className="mt-1 flex flex-col gap-2 rounded-lg border border-limao/40 bg-branco px-2 py-2">
          <p className="text-xs font-medium text-tinta">
            Prévia — ainda não vai para o Instagram. Assista e escolha.
          </p>
          <video
            key={videoPreview}
            src={`/api/lotes/${encodeURIComponent(loteId)}/video/${encodeURIComponent(videoPreview)}`}
            controls
            playsInline
            className="w-full rounded-md border border-linha"
            preload="metadata"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void decidir("aceitar")}
              className="rounded-full bg-limao px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              {ocupado === "aceitar" ? "Guardando…" : "Usar este Reel"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void decidir("recusar")}
              className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
            >
              {ocupado === "recusar" ? "Descartando…" : "Não usar"}
            </button>
          </div>
        </div>
      )}

      {temVideo && !temPreview && (
        <p className="text-xs text-folha">Reel aceito — use “Publicar como Reel”.</p>
      )}
      {ok && <p className="text-xs text-folha">{ok}</p>}
      {erro && (
        <p role="alert" className="rounded-lg bg-ink px-2 py-1.5 text-xs text-tinta">
          {erro}
        </p>
      )}
      <p className="text-[0.65rem] leading-snug text-cinza">
        {podeGerarReel
          ? `${dicaReel} Nada sobe sem você aceitar.`
          : permiteFoto
            ? "A arte antiga fica em backup no servidor. Foto até 8 MB · vídeo MP4 até 80 MB."
            : "Anúncio de produto não troca foto. Você pode anexar um MP4 para Reel."}
      </p>
    </div>
  );
}
