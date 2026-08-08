/**
 * Gera os criativos de demonstracao da landing.
 *
 * NAO chama o modelo: reaproveita conteudo de lotes ja gerados e apenas
 * re-renderiza a arte. Logo, nao consome cota e -- mais importante -- nao
 * usa a identidade de nenhuma assinante real. A marca vai como "@suamarca",
 * que e obviamente um espaco reservado e nao arrisca colidir com um perfil
 * de verdade.
 *
 * A selecao cobre os TRES nichos de proposito: o produto e multi-nicho, e a
 * variedade de paleta e tom e justamente o que precisa aparecer na venda.
 *
 * Uso: node scripts/gerar-demo-landing.mjs [pasta-de-saida]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { gerarCriativo } from '../src/criativo.js';
import { carregarNicho } from '../src/nichos.js';
import { buscarFoto } from '../src/foto.js';

const RAIZ = '/opt/postei/saida';
const DESTINO = process.argv[2] || path.join(RAIZ, 'demo-landing');
const MARCA = '@suamarca';

// Lotes antigos foram gerados antes do campo `buscaImagem` existir, entao a
// consulta da foto vai escrita a mao aqui. Sao consultas conferidas, nao
// palpite de modelo.
const SELECAO = [
  { nicho: 'receitas', lote: 'receitas_cozinha-da-bel_1786197579', post: 2, busca: 'garlic spaghetti plate' },
  { nicho: 'receitas', lote: 'receitas_cozinha-da-bel_1786197605', post: 1, busca: 'brazilian black beans bowl' },
  { nicho: 'receitas', lote: 'receitas_cozinha-da-bel_1786197000', post: 1, busca: null },
  { nicho: 'receitas', lote: 'receitas_cozinha-da-bel_1786197000', post: 3, busca: 'garlic onion cutting board' },

  { nicho: 'financas-pessoais', lote: 'financas-pessoais_grana-curta_1786197808', post: 2, busca: 'person paying bills calculator' },
  { nicho: 'financas-pessoais', lote: 'financas-pessoais_grana-curta_1786197808', post: 3, busca: 'coins glass jar savings' },
  { nicho: 'financas-pessoais', lote: 'financas-pessoais_grana-curta_1786197808', post: 1, busca: null },
  { nicho: 'financas-pessoais', lote: 'financas-pessoais_grana-curta_1786197808', post: 6, busca: 'notebook budget planning desk' },

  { nicho: 'nutricao-estudante', lote: 'nutricao-estudante_-jusantangelo-nutri_1786202294841', post: 2, busca: null },
  { nicho: 'nutricao-estudante', lote: 'nutricao-estudante_-jusantangelo-nutri_1786202294841', post: 24, busca: null },
  { nicho: 'nutricao-estudante', lote: 'nutricao-estudante_-jusantangelo-nutri_1786202294841', post: 1, busca: null },
  { nicho: 'nutricao-estudante', lote: 'nutricao-estudante_-jusantangelo-nutri_1786202294841', post: 23, busca: null },
];

async function acharLote(prefixo) {
  const pastas = await fs.readdir(RAIZ);
  const achada = pastas.find((p) => p.startsWith(prefixo));
  if (!achada) throw new Error(`Lote nao encontrado: ${prefixo}`);
  return path.join(RAIZ, achada);
}

await fs.rm(DESTINO, { recursive: true, force: true });
await fs.mkdir(DESTINO, { recursive: true });

const indice = [];
let n = 0;

for (const item of SELECAO) {
  const dirLote = await acharLote(item.lote);
  const pacote = JSON.parse(await fs.readFile(path.join(dirLote, 'pacote.json'), 'utf8'));
  const post = pacote.posts[item.post - 1];
  if (!post) {
    console.warn(`aviso: post ${item.post} nao existe em ${item.lote}`);
    continue;
  }

  const nicho = await carregarNicho(item.nicho);
  const consulta = item.busca || post.buscaImagem;
  const foto = post.formato !== 'lista' && consulta
    ? await buscarFoto({ consulta })
    : null;

  const { imagem, extensao, formato } = await gerarCriativo({ post, nicho, marca: MARCA, foto });

  n += 1;
  const arquivo = `${String(n).padStart(2, '0')}-${item.nicho}.${extensao}`;
  await fs.writeFile(path.join(DESTINO, arquivo), imagem);

  indice.push({
    arquivo,
    nicho: nicho.nome,
    nichoId: nicho.id,
    formato,
    titulo: post.titulo,
    comFoto: Boolean(foto),
  });
  process.stdout.write(formato === 'foto' ? 'F' : 't');
}

await fs.writeFile(path.join(DESTINO, 'indice.json'), JSON.stringify(indice, null, 2), 'utf8');

const porNicho = indice.reduce((acc, i) => ({ ...acc, [i.nichoId]: (acc[i.nichoId] || 0) + 1 }), {});
console.log(`\n${n} criativos em ${DESTINO}`);
console.log('por nicho:', JSON.stringify(porNicho));
console.log('com foto:', indice.filter((i) => i.comFoto).length, '| tipograficos:', indice.filter((i) => !i.comFoto).length);
