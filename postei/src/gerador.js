import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { chamarLLM, extrairJSON } from './llm.js';
import { carregarNicho } from './nichos.js';
import { gerarCriativo } from './criativo.js';
import { buscarFoto } from './foto.js';

/**
 * M1 - Nucleo de geracao.
 * Entra: nicho + marca + quantidade. Sai: pacote de posts prontos
 * (imagem + legenda + hashtags + CTA).
 */

const SISTEMA = `Voce e redator de social media brasileiro, especialista em conteudo curto para Instagram.
Escreve em portugues do Brasil, no tom exato pedido, sempre de forma concreta e especifica.

REGRAS INEGOCIAVEIS:
- ORTOGRAFIA: acentuacao correta e obrigatoria em TODAS as palavras
  ("dívidas", "até", "salário", "você"). Texto sem acento vai direto para a
  arte do post e queima a credibilidade da marca do assinante.
- MAIUSCULA: titulo e legenda comecam com letra maiuscula. Nunca escreva
  tudo em caixa baixa.
- NUMERO: nunca invente estatistica, percentual ou valor ("50% de desconto",
  "3x mais vendas"). Se nao for fato verificavel, escreva sem numero.
- VALOR NUTRICIONAL: nunca cite caloria, grama, macro ou porcentagem de
  nutriente. Voce NAO tem tabela de composicao e chutaria o numero. Fale de
  COMPOSICAO e funcao ("fonte de proteina", "rico em fibra", "sustenta mais
  porque tem gordura boa"), nunca de contagem.
- EXPERIENCIA: nunca invente vivencia de quem assina o post. Nada de "essa
  semana um cliente", "atendi uma pessoa que", "no meu consultorio". Voce nao
  sabe o que essa pessoa viveu, e caso inventado desmorona no primeiro
  comentario pedindo detalhe. Use observacao geral: "e comum", "costuma
  acontecer".
- Nunca prometa ganho financeiro, resultado garantido, cura ou emagrecimento.
- Nunca use "link na bio" como unico CTA, nem clickbait vazio.
- Nada de emoji em excesso: no maximo 2 por legenda.
- Cada post trata de UM assunto especifico. "Dicas de sucesso" nao e assunto.
- Nao repita a estrutura de frase entre os posts do mesmo lote.`;

/** Posts por chamada. Acima disso o modelo trunca o JSON de saida. */
const TAM_BLOCO = 5;

/** Teto de chamadas por pacote: impede loop infinito quando o modelo trava
 *  num tema so e passa a devolver sempre a mesma coisa. */
const MAX_TENTATIVAS = 12;

/** Quantos 429 seguidos antes de desistir e devolver o lote parcial. */
const MAX_429_SEGUIDOS = 3;

/** Pausa entre blocos. O free tier do Gemini teto em 20 req/min. */
const INTERVALO_BLOCO_MS = Number(process.env.INTERVALO_BLOCO_MS || 3500);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sorteia os temas do bloco em vez de mandar a lista inteira e torcer.
 *
 * Entregando todos os temas de uma vez, o modelo pega sempre os primeiros da
 * lista: num nicho com tres recortes, um pacote de 12 posts saia inteiro do
 * primeiro recorte e os outros dois nunca apareciam. Sortear e code, e code
 * o modelo nao ignora.
 */
function sortearTemas(todos, quantos, jaUsados) {
  const disponiveis = todos.filter((t) => !jaUsados.has(t));
  // Ciclo fechado: se o pacote pede mais posts do que ha temas, reabre a
  // roda em vez de travar sem tema para oferecer.
  const fonte = disponiveis.length >= quantos ? disponiveis : [...todos];
  const baralho = [...fonte];
  for (let i = baralho.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  const escolhidos = baralho.slice(0, quantos);
  escolhidos.forEach((t) => jaUsados.add(t));
  return escolhidos;
}

/**
 * Chave de comparacao de titulo. Ignora acento, pontuacao e ordem das
 * palavras -- "Seu salario some antes do dia 20" e "O salario sumiu antes
 * do dia 20" viram quase a mesma coisa, e e exatamente esse tipo de
 * quase-duplicata que o modelo produz entre blocos.
 */
function chaveTitulo(titulo) {
  if (!titulo || typeof titulo !== 'string') return null;
  const IRRELEVANTES = new Set([
    'a', 'o', 'e', 'de', 'do', 'da', 'que', 'seu', 'sua', 'em', 'no', 'na',
    'com', 'para', 'por', 'um', 'uma', 'seus', 'suas', 'seu',
  ]);
  const palavras = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 2 && !IRRELEVANTES.has(p));
  return palavras.length ? [...new Set(palavras)].sort().join('-') : null;
}

function montarPrompt({ nicho, marca, quantidade, jaGerados = [], temas = [] }) {
  return `Gere ${quantidade} posts de Instagram para a marca "${marca}", no nicho "${nicho.nome}".

PUBLICO: ${nicho.publico}
TOM DE VOZ: ${nicho.tomDeVoz}
TEMAS DESTE BLOCO - use EXATAMENTE um post por tema, na ordem abaixo:
${temas.map((t, i) => `${i + 1}. ${t}`).join('\n')}
${nicho.observacoes ? `\nATENCAO ESPECIFICA DESTE NICHO: ${nicho.observacoes}` : ''}

Responda APENAS um objeto JSON, sem texto em volta, neste formato:
{
  "posts": [
    {
      "formato": "citacao" | "destaque" | "lista",
      "titulo": "frase da IMAGEM. Maximo 10 palavras. Impacto, sem ponto final.",
      "subtitulo": "1 linha de apoio na imagem, max 12 palavras. Use so no formato destaque.",
      "itens": ["usado SO no formato lista: 3 a 4 itens, max 8 palavras cada"],
      "legenda": "2 a 4 frases curtas para a legenda. Concreta, entrega valor real, sem repetir o titulo.",
      "hashtags": ["7 a 10 hashtags em minusculo, sem #, misturando amplas e especificas"],
      "cta": "1 frase curta de chamada para acao, natural, sem 'link na bio'",
      "buscaImagem": "UMA unica busca de 2 a 4 palavras EM INGLES, sem virgula e sem alternativas. Descreva o OBJETO concreto, nunca o conceito. Bom: 'school lunchbox fruit'. Ruim: 'healthy lifestyle' ou 'eggs, lentils, sardines'."
    }
  ]
}

Distribua os formatos: use os tres tipos ao longo do lote.${
    jaGerados.length
      ? `\n\nJA FORAM GERADOS os titulos abaixo neste mesmo pacote. NAO repita o
assunto nem a estrutura de frase de nenhum deles:
${jaGerados.map((p) => `- ${p.titulo}`).join('\n')}`
      : ''
  }`;
}

/**
 * Hashtag com espaco quebra no Instagram: "#receita rapida" registra so
 * "#receita" e joga o resto como texto solto. O modelo devolve com espaco
 * mesmo instruido a nao fazer, entao a normalizacao tem que ser codigo.
 * Acento tambem sai -- o padrao de mercado no BR e sem.
 */
function normalizarHashtags(lista) {
  const vistas = new Set();
  const saida = [];
  for (const bruta of lista) {
    const tag = String(bruta)
      .normalize('NFD') // separa a letra do acento para o filtro abaixo
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (tag.length < 3 || vistas.has(tag)) continue;
    vistas.add(tag);
    saida.push(tag);
  }
  return saida;
}

/**
 * Reduz a busca de imagem a UMA frase curta.
 *
 * Mesmo instruido, o modelo devolve alternativas separadas por virgula
 * ("glass of water, person holding water bottle, dark urine color chart").
 * Busca assim nao acha nada em banco de imagem: sao termos concorrentes,
 * nao uma cena. Fica so o primeiro trecho, com teto de 4 palavras.
 */
function normalizarBusca(bruta) {
  if (!bruta || typeof bruta !== 'string') return null;
  const primeira = bruta.split(/[,;|/]|\bou\b|\bor\b/i)[0];
  const palavras = primeira
    .replace(/["'`.]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  return palavras.length ? palavras.join(' ') : null;
}

/**
 * Nome de pasta seguro para o id do assinante.
 *
 * O id chega de fora (vem do Supabase). Sem higienizar, um id contendo
 * "../" escreveria fora do diretorio de saida -- e o mesmo valor e usado
 * depois para LER os lotes, o que viraria leitura de arquivo arbitraria.
 */
export function pastaDoAssinante(id) {
  const limpo = String(id).replace(/[^a-zA-Z0-9._-]/g, '');
  if (!limpo || limpo === '.' || limpo === '..') {
    throw new Error(`assinanteId invalido: ${JSON.stringify(id)}`);
  }
  return limpo;
}

function validarPost(p, indice) {
  const erros = [];
  if (!p.titulo?.trim()) erros.push('titulo vazio');
  if (!p.legenda?.trim()) erros.push('legenda vazia');
  if (!Array.isArray(p.hashtags) || p.hashtags.length === 0) erros.push('sem hashtags');
  if (erros.length) throw new Error(`Post ${indice + 1} invalido: ${erros.join(', ')}`);

  const hashtags = normalizarHashtags(p.hashtags);
  if (hashtags.length === 0) {
    throw new Error(`Post ${indice + 1}: nenhuma hashtag sobreviveu a normalizacao.`);
  }

  return {
    formato: p.formato || 'destaque',
    titulo: p.titulo.trim(),
    subtitulo: p.subtitulo?.trim() || null,
    itens: Array.isArray(p.itens) ? p.itens.filter(Boolean) : [],
    legenda: p.legenda.trim(),
    hashtags,
    cta: p.cta?.trim() || null,
    buscaImagem: normalizarBusca(p.buscaImagem),
  };
}

export async function gerarPacote({ nichoId, marca, quantidade = 5, assinanteId, comFoto = true }) {
  if (!assinanteId) {
    // Sem isso o LiteLLM nao consegue atribuir o custo, e o teto por plano
    // deixa de existir. Falhar aqui e melhor do que gerar de graca.
    throw new Error('assinanteId e obrigatorio (e o que ancora o budget no LiteLLM).');
  }

  const qtd = Math.min(Math.max(1, Number(quantidade) || 1), config.maxPostsPorLote);
  const nicho = await carregarNicho(nichoId);
  const inicio = Date.now();

  // Geracao em blocos: acima de ~6 posts numa tacada o modelo estoura o
  // limite de saida e devolve JSON truncado no meio. Blocos menores tambem
  // rendem mais variedade, porque cada chamada sorteia temas de novo.
  const bruto = [];
  const vistos = new Set();
  const usoTotal = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let falhas = 0;
  let tentativas = 0;
  let seguidasCom429 = 0;
  const temasUsados = new Set();

  // Roda ate juntar a quantidade pedida em posts DISTINTOS. O modelo repete
  // titulo entre blocos mesmo recebendo a lista do que ja gerou, entao a
  // deduplicacao precisa ser codigo -- num pacote de 90 posts/mes, post
  // repetido e o que faz o assinante cancelar.
  while (bruto.length < qtd && tentativas < MAX_TENTATIVAS) {
    tentativas += 1;
    const pedir = Math.min(TAM_BLOCO, qtd - bruto.length);
    try {
      const { conteudo, uso } = await chamarLLM({
        sistema: SISTEMA,
        prompt: montarPrompt({
          nicho,
          marca,
          quantidade: pedir,
          jaGerados: bruto,
          temas: sortearTemas(nicho.temas, pedir, temasUsados),
        }),
        assinanteId,
        json: true,
      });
      if (uso) {
        usoTotal.prompt_tokens += uso.prompt_tokens || 0;
        usoTotal.completion_tokens += uso.completion_tokens || 0;
        usoTotal.total_tokens += uso.total_tokens || 0;
      }

      const dados = extrairJSON(conteudo);
      const lista = Array.isArray(dados) ? dados : dados.posts;
      if (!Array.isArray(lista)) continue;

      for (const p of lista) {
        if (bruto.length >= qtd) break;
        const chave = chaveTitulo(p?.titulo);
        if (!chave || vistos.has(chave)) continue;
        vistos.add(chave);
        bruto.push(p);
      }
      seguidasCom429 = 0;

      // O free tier do Gemini permite 20 requisicoes/minuto. Um pacote do
      // plano Estudio (300 posts = 60 chamadas) estoura isso em segundos se
      // disparar em rajada, entao o ritmo e imposto aqui.
      if (bruto.length < qtd) await esperar(INTERVALO_BLOCO_MS);
    } catch (erro) {
      // Um bloco que falha nao pode derrubar o lote inteiro: o assinante
      // prefere 25 posts a um erro. So desiste se nada vier.
      falhas += 1;
      console.warn(`[postei] bloco falhou (${falhas}): ${erro.message}`);

      if (erro.rateLimit) {
        seguidasCom429 += 1;
        if (seguidasCom429 >= MAX_429_SEGUIDOS) {
          console.warn('[postei] cota do provedor esgotada - devolvendo lote parcial.');
          break;
        }
        // Espera o que o provedor mandou esperar (teto de 70s para nao
        // segurar a requisicao indefinidamente); so chuta se ele nao disser.
        const espera = Math.min(erro.esperarMs ?? 2000 * 2 ** (seguidasCom429 - 1), 70000);
        console.warn(`[postei] aguardando ${Math.round(espera / 1000)}s pela cota...`);
        await esperar(espera);
      }
    }
  }

  if (bruto.length === 0) {
    throw new Error('O modelo nao devolveu nenhum post utilizavel.');
  }

  // O modelo entrega mais posts do que o pedido com frequencia. Como o plano
  // e vendido por volume (30/90/300 posts), entregar a mais e furo de cota --
  // o corte tem que ser no codigo, nao no prompt.
  const posts = bruto.slice(0, qtd).map(validarPost);

  // Pasta por lote: o assinante recebe o mes inteiro de uma vez e precisa
  // conseguir achar o que e de quando.
  const loteId = `${nicho.id}_${marca.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}_${Date.now()}`;
  // Cada assinante em sua propria pasta: sem isso, listar os lotes de um
  // exporia os pacotes de todos os outros. O id vem do Supabase e ja foi
  // higienizado em `pastaDoAssinante`.
  const dirLote = path.join(config.saida, pastaDoAssinante(assinanteId), loteId);
  await fs.mkdir(dirLote, { recursive: true });

  const resultado = [];
  for (const [i, post] of posts.entries()) {
    // Foto e opcional por design: se a busca falhar, o criativo cai no
    // template tipografico em vez de derrubar o post.
    // O formato lista nao usa foto (precisa dos itens legiveis), entao nem
    // buscamos -- evita chamada inutil a API e credito de fotografo em arte
    // que nao tem fotografia nenhuma.
    const usaraFoto = comFoto && post.formato !== 'lista';
    const foto = usaraFoto ? await buscarFoto({ consulta: post.buscaImagem }) : null;

    const { imagem, extensao, formato } = await gerarCriativo({ post, nicho, marca, foto });
    const arquivo = `post-${String(i + 1).padStart(2, '0')}.${extensao}`;
    await fs.writeFile(path.join(dirLote, arquivo), imagem);

    resultado.push({
      ...post,
      formato,
      // So registra a foto se o layout realmente a usou.
      foto: formato === 'foto' && foto ? { autor: foto.autor, origem: foto.origem } : null,
      imagem: arquivo,
      textoParaColar: `${post.legenda}\n\n${post.cta || ''}\n\n${post.hashtags
        .map((h) => `#${h}`)
        .join(' ')}`.trim(),
    });
  }

  const pacote = {
    loteId,
    nicho: { id: nicho.id, nome: nicho.nome },
    marca,
    assinanteId,
    geradoEm: new Date().toISOString(),
    duracaoMs: Date.now() - inicio,
    usoTokens: usoTotal,
    blocosComFalha: falhas,
    // Quem chama precisa saber que veio menos do que a cota do plano previa,
    // para reagendar o restante em vez de dar o mes por entregue.
    solicitados: qtd,
    parcial: resultado.length < qtd,
    posts: resultado,
  };

  await fs.writeFile(
    path.join(dirLote, 'pacote.json'),
    JSON.stringify(pacote, null, 2),
    'utf8',
  );

  return { ...pacote, diretorio: dirLote };
}
