import Image from "next/image";
import Link from "next/link";
import { campanhaAm } from "@/lib/campanha-am";

export function Heroi() {
  return <section className="studio-hero">
    <div className="mx-auto max-w-6xl px-5">
      <div className="studio-hero-grid">
        <div>
          <p className="rotulo mb-6 flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-limao" />POSTEI / CONTEÚDO COM IDENTIDADE</p>
          <h1 className="fonte-display">Sua marca merece<br /><em>mais presença.</em></h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-cinza">Do primeiro rascunho ao post publicado. Conteúdo no tom do seu negócio, identidade visual e uma rotina de revisão para Instagram e LinkedIn.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/painel" className="rounded-lg bg-limao px-6 py-4 font-semibold text-ink transition-transform hover:-translate-y-1">Abrir meu estúdio ↗</Link>
            <a href="#demo" className="rounded-lg border border-linha px-6 py-4 font-medium hover:border-folha">Explorar os exemplos</a>
          </div>
          <p className="mt-5 text-sm text-cinza">Comece com 2 posts de teste, sem cartão.</p>
        </div>
        <div>
          <div className="studio-wall">
            {campanhaAm.slice(0, 2).map(item => <Image key={item.arquivo} src={`/campanha-am/${item.arquivo}`} alt={`Referência de campanha AM: ${item.titulo}`} width={1122} height={1402} priority sizes="(max-width: 850px) 45vw, 25vw" />)}
          </div>
          <p className="text-center text-xs leading-relaxed text-cinza">Campanha AM criada com IA externa.<br />Artes prontas podem ser importadas no estúdio da marca.</p>
        </div>
      </div>
      <div className="studio-baseline"><span>01 / Crie com contexto</span><span>02 / Revise a sua identidade</span><span>03 / Publique com intenção</span><span className="md:ml-auto">Um produto AM Consultoria</span></div>
    </div>
  </section>;
}
