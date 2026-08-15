import { Venda } from "@/components/site/Venda";
import { Heroi } from "@/components/site/Heroi";
import {
  Problema,
  Nichos,
  ComoFunciona,
  Planos,
  Perguntas,
  ChamadaFinal,
  Rodape,
} from "@/components/site/Secoes";

export default function Home() {
  return (
    <Venda barra>
      <main className="flex-1">
        <Heroi />
        <Problema />
        <ComoFunciona />
        <Nichos />
        <Planos />
        <Perguntas />
        <ChamadaFinal />
      </main>
      <Rodape />
    </Venda>
  );
}
