import Image from "next/image";
import type { Criativo } from "@/lib/conteudo";

/**
 * Esteira contínua de criativos.
 *
 * Aqui NAO usamos o ScrollVelocity do React Bits: ele monta uma faixa por
 * item do array e repete o MESMO item `numCopies` vezes -- otimo para uma
 * palavra passando, errado para uma sequencia de imagens distintas. Alem
 * disso ele inverte o sentido conforme a velocidade da rolagem, o que faz a
 * faixa "recomecar" toda vez que a pessoa desce a pagina.
 *
 * Esta versao e uma animacao CSS determinista: a trilha guarda a lista duas
 * vezes e desliza exatamente -50%, o que faz a emenda cair no ponto em que a
 * segunda copia esta na posicao da primeira -- laco sem salto.
 */
export function Esteira({
  itens,
  sentido = "esquerda",
  duracao = 60,
}: {
  itens: Criativo[];
  sentido?: "esquerda" | "direita";
  duracao?: number;
}) {
  return (
    <div className="esteira" aria-hidden="true">
      <div
        className={`esteira-trilha ${sentido === "direita" ? "esteira-trilha--invertida" : ""}`}
        style={{ animationDuration: `${duracao}s` }}
      >
        {[0, 1].map((copia) =>
          itens.map((c) => (
            <figure key={`${copia}-${c.arquivo}`} className="esteira-item">
              <Image
                src={`/mostra/${c.arquivo}`}
                alt=""
                width={1080}
                height={1350}
                className="block h-auto w-full"
                sizes="220px"
                priority={copia === 0}
              />
            </figure>
          )),
        )}
      </div>
    </div>
  );
}
