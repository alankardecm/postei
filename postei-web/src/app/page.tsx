import { Cabecalho } from "@/components/site/Cabecalho";
import { Heroi } from "@/components/site/Heroi";
import {
  Nichos,
  ComoFunciona,
  Numeros,
  Planos,
  Perguntas,
  ChamadaFinal,
  Rodape,
} from "@/components/site/Secoes";

export default function Home() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1">
        <Heroi />
        <Nichos />
        <ComoFunciona />
        <Numeros />
        <Planos />
        <Perguntas />
        <ChamadaFinal />
      </main>
      <Rodape />
    </>
  );
}
