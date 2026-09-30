"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { campanhaAm } from "@/lib/campanha-am";

export function ImportarArte() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [titulo, setTitulo] = useState("");
  const [legenda, setLegenda] = useState("");
  const [marca, setMarca] = useState("AM Consultoria");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const previewRef = useRef("");
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  function selecionarArquivo(file: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(file);
    setPreview(previewRef.current);
    setArquivo(file);
  }

  async function usarExemplo(indice: number) {
    setOcupado(true); setErro("");
    try {
      const item = campanhaAm[indice];
      const resposta = await fetch(`/campanha-am/${item.arquivo}`);
      if (!resposta.ok) throw new Error("Não consegui carregar a arte.");
      selecionarArquivo(new File([await resposta.blob()], item.arquivo, { type: "image/png" }));
      setTitulo(item.titulo); setLegenda(item.legenda);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch { setErro("Não consegui carregar a arte de referência."); }
    finally { setOcupado(false); }
  }
  async function importar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) { setErro("Escolha uma arte."); return; }
    setOcupado(true); setErro("");
    try {
      const body = new FormData();
      body.set("arquivo", arquivo); body.set("marca", marca); body.set("titulo", titulo); body.set("legenda", legenda);
      const resposta = await fetch("/api/importacoes", { method: "POST", body });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Importação indisponível.");
      router.push(`/painel/lote/${encodeURIComponent(dados.loteId)}`);
      router.refresh();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao importar."); }
    finally { setOcupado(false); }
  }
  return <section id="estudio-am" className="studio-panel mt-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="rotulo">Estúdio AM / arte pronta</p><h2 className="fonte-display mt-3 text-3xl font-semibold tracking-tight">Sua arte. Inteira. No feed.</h2>
      <p className="mt-3 max-w-2xl text-cinza">Traga uma imagem finalizada, revise a legenda e siga para publicar ou agendar. Sem texto por cima, sem recortar a composição.</p></div>
      <span className="studio-badge">MARCA PRÓPRIA</span>
    </div>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {campanhaAm.map((item, i) => <button key={item.arquivo} type="button" disabled={ocupado} onClick={() => void usarExemplo(i)} className="studio-example text-left disabled:opacity-50">
        <Image src={`/campanha-am/${item.arquivo}`} alt={item.titulo} width={1122} height={1402} className="h-auto w-full" />
        <span className="block p-3"><span className="rotulo">{item.etapa}</span><span className="mt-2 block text-sm text-folha">Usar esta arte ↗</span></span>
      </button>)}
    </div>
    <form ref={formRef} onSubmit={importar} className="mt-8 scroll-mt-24 border-t border-linha pt-7">
      <fieldset disabled={ocupado} className="grid gap-5 md:grid-cols-[220px_1fr]">
        <div><label className="block text-sm font-medium">Arte final
          <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-xs text-cinza file:mr-2 file:rounded-md file:border-0 file:bg-limao file:px-3 file:py-2 file:text-ink" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) { setErro("A arte deve ter até 8 MB."); e.target.value = ""; return; }
            selecionarArquivo(file); setErro("");
          }} /></label>
          {preview && <Image src={preview} alt="Prévia da arte escolhida" width={1080} height={1350} unoptimized className="mt-4 max-h-72 w-full rounded-lg border border-linha object-contain" />}
          <p className="mt-3 text-xs leading-relaxed text-cinza">PNG, JPEG ou WebP · até 8 MB.<br />O arquivo é ajustado para 1080 × 1350 sem cortes.</p>
        </div>
        <div className="grid gap-4">
          <label className="studio-label">Marca<input value={marca} onChange={e => setMarca(e.target.value)} maxLength={40} required className="studio-input" /></label>
          <label className="studio-label">Título para identificar o post<input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} required className="studio-input" /></label>
          <label className="studio-label">Legenda e hashtags<textarea value={legenda} onChange={e => setLegenda(e.target.value)} maxLength={2200} required rows={7} className="studio-input resize-y" /><span className="text-right text-xs text-cinza">{legenda.length}/2.200</span></label>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-4"><button type="submit" disabled={!arquivo || ocupado} className="rounded-lg bg-limao px-6 py-3 font-semibold text-ink disabled:opacity-50">{ocupado ? "Preparando…" : "Salvar e revisar publicação ↗"}</button><p className="text-xs text-cinza">Sem geração por IA. Nada é publicado nesta etapa.</p></div>
      </fieldset>
      {erro && <p role="alert" className="mt-4 text-sm text-red-300">{erro}</p>}
    </form>
  </section>;
}
