import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

/**
 * Peças da marca Postei — anúncio de produto, não post de nicho.
 * Cores ficam fixas: o Instagram da Postei não herda paleta de cliente.
 */

export const MARCA_VISUAL = {
  creme: '#F4F1EA',
  preto: '#111111',
  verde: '#16C45A',
  verdeEscuro: '#16382A',
  cremeCard: '#E8E3D6',
  cinza: '#5C5C5C',
  branco: '#FFFFFF',
  phone: '#1C1C1E',
  tela: '#FAFAF7',
};

/** Mini cards que aparecem dentro do iPhone. Foto vem do /mostra se existir. */
export const GRADE_PADRAO = [
  { tipo: 'texto', fundo: '#16382A', tinta: '#F4F1EA', titulo: 'Organize suas finanças e alcance seus objetivos.' },
  { tipo: 'foto', arquivo: '05-financas-pessoais.jpg' },
  { tipo: 'texto', fundo: '#16382A', tinta: '#F4F1EA', titulo: '3 hábitos que melhoram suas finanças' },
  { tipo: 'foto', arquivo: '01-receitas.jpg' },
  { tipo: 'texto', fundo: '#E8E3D6', tinta: '#16382A', titulo: 'Comer bem não precisa ser complicado.' },
  { tipo: 'foto', arquivo: '09-nutricao-estudante.jpg' },
  { tipo: 'texto', fundo: '#16382A', tinta: '#F4F1EA', titulo: 'Alimente seu corpo, transforme sua vida.' },
  { tipo: 'foto', arquivo: '02-receitas.jpg' },
  { tipo: 'texto', fundo: '#E8E3D6', tinta: '#16382A', titulo: 'Pequenas escolhas, grandes resultados.' },
];

const DIR_FOTO = [
  path.join(config.raiz, 'assets', 'anuncio'),
  path.join(config.raiz, '..', 'postei-web', 'public', 'mostra'),
  '/opt/postei-web/public/mostra',
];

let cacheFotos = null;

async function acharArquivo(nome) {
  for (const dir of DIR_FOTO) {
    const alvo = path.join(dir, nome);
    try {
      await fs.access(alvo);
      return alvo;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

/**
 * Recorta o topo das artes de amostra (a foto, não o painel de texto)
 * e devolve data URI. Sem arquivo, o tile vira card tipográfico.
 */
export async function carregarFotosGrade() {
  if (cacheFotos) return cacheFotos;

  const sharp = (await import('sharp')).default;
  const mapa = new Map();

  for (const tile of GRADE_PADRAO) {
    if (tile.tipo !== 'foto') continue;
    const arquivo = await acharArquivo(tile.arquivo);
    if (!arquivo) continue;
    try {
      const meta = await sharp(arquivo).metadata();
      const w = meta.width || 1080;
      const h = meta.height || 1350;
      const hFoto = Math.max(1, Math.round(h * 0.56));
      const buf = await sharp(arquivo)
        .extract({ left: 0, top: 0, width: w, height: Math.min(hFoto, h) })
        .resize(360, 360, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
      mapa.set(tile.arquivo, `data:image/jpeg;base64,${buf.toString('base64')}`);
    } catch {
      // tile cai no fallback tipográfico
    }
  }

  cacheFotos = mapa;
  return mapa;
}

export function textoBotao(post) {
  const cta = String(post?.cta || '').trim();
  if (cta && cta.length <= 28) return cta;
  return 'Começar teste grátis';
}

export const FORMATOS_ANUNCIO = new Set(['anuncioProduto', 'anuncioCta', 'anuncioIa']);
