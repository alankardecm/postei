"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Troca de foto (Pexels / upload) e anexo de vídeo para Reels.
 * Ver docs/MIDIA-FOTO-VIDEO.md — o motor grava backup antes de sobrescrever.
 */
export function MidiaPost({
  loteId,
  indice,
  temVideo,
}: {
  loteId: string;
  indice: number;
  temVideo: boolean;
}) {
  const router = useRouter();
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputVideo = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState<"pexels" | "foto" | "video" | null>(null);
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

  const busy = ocupado !== null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-linha bg-papel px-3 py-3">
      <span className="rotulo">Mídia</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void pexels()}
          className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {ocupado === "pexels" ? "Buscando…" : "Outra foto (banco)"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputFoto.current?.click()}
          className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {ocupado === "foto" ? "Aplicando…" : "Enviar minha foto"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputVideo.current?.click()}
          className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium transition-colors hover:border-tinta/50 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
        >
          {ocupado === "video" ? "Enviando…" : temVideo ? "Trocar vídeo (MP4)" : "Anexar vídeo (MP4)"}
        </button>
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

      {temVideo && (
        <p className="text-xs text-folha">Vídeo anexado — use “Publicar como Reel”.</p>
      )}
      {ok && <p className="text-xs text-folha">{ok}</p>}
      {erro && (
        <p role="alert" className="rounded-lg bg-tinta px-2 py-1.5 text-xs text-papel">
          {erro}
        </p>
      )}
      <p className="text-[0.65rem] leading-snug text-cinza">
        A arte antiga fica em backup no servidor. Foto até 8 MB · vídeo MP4 até 80 MB.
      </p>
    </div>
  );
}
