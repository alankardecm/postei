import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const DIR_NICHOS = path.join(config.raiz, 'nichos');

/**
 * M2 - Biblioteca de nichos.
 *
 * Cada nicho e um arquivo JSON. Adicionar nicho novo = soltar um arquivo na
 * pasta, sem deploy e sem tocar em codigo. Foi assim de proposito: nicho e
 * conteudo, e conteudo nao deveria exigir um engenheiro.
 */

const CAMPOS_OBRIGATORIOS = ['id', 'nome', 'publico', 'tomDeVoz', 'temas', 'paleta'];

function validar(nicho, arquivo) {
  const faltando = CAMPOS_OBRIGATORIOS.filter((c) => !nicho[c]);
  if (faltando.length) {
    throw new Error(`Nicho '${arquivo}' invalido - campos ausentes: ${faltando.join(', ')}`);
  }
  if (!Array.isArray(nicho.temas) || nicho.temas.length === 0) {
    throw new Error(`Nicho '${arquivo}': 'temas' precisa ser uma lista nao vazia.`);
  }
  for (const cor of ['fundo', 'texto', 'destaque']) {
    if (!nicho.paleta[cor]) {
      throw new Error(`Nicho '${arquivo}': paleta sem a cor '${cor}'.`);
    }
  }
  return nicho;
}

export async function listarNichos() {
  const arquivos = (await fs.readdir(DIR_NICHOS)).filter((f) => f.endsWith('.json'));
  const nichos = [];
  for (const arq of arquivos) {
    const bruto = await fs.readFile(path.join(DIR_NICHOS, arq), 'utf8');
    nichos.push(validar(JSON.parse(bruto), arq));
  }
  return nichos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function carregarNicho(id) {
  const seguro = String(id).replace(/[^a-z0-9-]/gi, '');
  if (!seguro) throw new Error(`Id de nicho invalido: '${id}'`);

  const alvo = path.join(DIR_NICHOS, `${seguro}.json`);
  try {
    return validar(JSON.parse(await fs.readFile(alvo, 'utf8')), `${seguro}.json`);
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      const disponiveis = (await listarNichos()).map((n) => n.id).join(', ');
      throw new Error(`Nicho '${seguro}' nao existe. Disponiveis: ${disponiveis}`);
    }
    throw erro;
  }
}
