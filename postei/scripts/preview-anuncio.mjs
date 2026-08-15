import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarCriativo } from '../src/criativo.js';
import { carregarNicho } from '../src/nichos.js';
import { TELAS } from '../src/rede.js';

/**
 * Renderiza as peças de anúncio sem chamar o LLM.
 * Uso: node scripts/preview-anuncio.mjs
 */
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saida = path.join(raiz, 'validacao', 'anuncio');

const AMOSTRAS = [
  {
    arquivo: '01-tela-em-branco.jpg',
    formato: 'anuncioProduto',
    titulo: 'Pare de encarar a tela em branco.',
    subtitulo: 'Seu mês no Instagram pronto em minutos, sem precisar de design ou Canva.',
    cta: 'Começar teste grátis',
  },
  {
    arquivo: '02-trinta-dias.jpg',
    formato: 'anuncioProduto',
    titulo: '30 dias de posts em menos de 2 minutos.',
    subtitulo: 'Sua vitrine profissional no Instagram e LinkedIn, sem abrir o Canva.',
    cta: 'Experimentar grátis',
  },
  {
    arquivo: '03-provas.jpg',
    formato: 'anuncioCta',
    titulo: 'Ainda perde horas criando posts?',
    subtitulo: 'O Postei monta o mês com imagem e legenda. Você revisa e publica.',
    itens: [
      '30 posts com imagem e legenda',
      'Sem Canva e sem cartão',
      'Publica no Instagram e no LinkedIn',
    ],
    cta: 'Começar teste grátis',
  },
];

const nicho = await carregarNicho('postei-marca');
await fs.mkdir(saida, { recursive: true });

for (const amostra of AMOSTRAS) {
  const { imagem } = await gerarCriativo({
    post: amostra,
    nicho,
    marca: 'Postei',
    tela: TELAS.instagram,
  });
  const destino = path.join(saida, amostra.arquivo);
  await fs.writeFile(destino, imagem);
  console.log(`ok  ${amostra.arquivo}  ${(imagem.length / 1024).toFixed(0)} KB`);
}

console.log(`\nPeças em ${saida}`);
