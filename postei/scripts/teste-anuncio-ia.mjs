import fs from 'node:fs/promises';
import { gerarAnuncioIa } from '../src/imagem-ia.js';

const post = {
  titulo: 'Pare de encarar a tela em branco.',
  subtitulo: 'Seu mês no Instagram pronto em minutos, sem Canva.',
  cta: 'Começar teste grátis',
  visual: 'iPhone em 3D com cards de post flutuando, fundo creme, anúncio de app',
};

const t0 = Date.now();
const img = await gerarAnuncioIa({ post });
const destino = process.argv[2] || '/tmp/postei-anuncio-ia.jpg';
await fs.writeFile(destino, img);
console.log(`OK ${destino} bytes=${img.length} ms=${Date.now() - t0}`);
