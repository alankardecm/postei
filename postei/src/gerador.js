import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { chamarLLM, extrairJSON } from './llm.js';
import { carregarNicho } from './nichos.js';
import { gerarCriativo, gerarCarrossel } from './criativo.js';
import { buscarFoto } from './foto.js';
import { buscarEvidencia } from './ciencia.js';
import { dnaDaMarca } from './banco.js';
import { paletaDaMarca } from './paleta.js';

/**
 * M1 - Nucleo de geracao.
 * Entra: nicho + marca + quantidade. Sai: pacote de posts prontos
 * (imagem + legenda + hashtags + CTA).
 */

const SISTEMA = `Voce e redator de social media brasileiro, especialista em conteudo curto para Instagram.
Escreve em portugues do Brasil, no tom exato pedido, sempre de forma concreta e especifica.

AS DUAS REGRAS QUE MAIS IMPORTAM:

1. GANCHO NO TITULO. O titulo nao descreve o assunto -- ele faz a pessoa
   parar de rolar. Descrever e o erro mais comum. Use um destes caminhos:
   - contrariar uma crenca comum ("Carboidrato a noite nao engorda")
   - a pergunta que a pessoa ja se faz ("Seu salario some antes do dia 20?")
   - o erro que ela provavelmente comete ("O jeito errado de guardar salada")
   - a consequencia concreta ("Isso faz seu paozinho durar 3 dias a mais")
   RUIM (descreve): "Dicas de alimentacao saudavel", "A importancia da
   fibra", "Como economizar dinheiro".
   BOM (fisga): "Voce esta jogando fora a parte mais nutritiva",
   "O lanche das 16h que sabota seu jantar".

2. ESPECIFICIDADE. Todo post precisa de pelo menos UMA ancora concreta:
   um alimento com nome, uma medida de preparo, um momento do dia, uma
   situacao reconhecivel ou um passo executavel. Conselho abstrato nao
   ensina nada e e o motivo de conteudo gerado parecer generico.
   RUIM: "Prefira alimentos saudaveis", "Organize suas financas",
   "Frutas faceis de manusear".
   BOM: "Uma colher de aveia no iogurte segura a fome ate o almoco",
   "Anote so os gastos do cartao por 7 dias -- o resto vem depois".
   Se o post pudesse ser publicado por qualquer perfil de qualquer ramo,
   ele esta generico demais. Reescreva.

REGRAS INEGOCIAVEIS:
- ORTOGRAFIA: acentuacao correta e obrigatoria em TODAS as palavras
  ("dívidas", "até", "salário", "você"). Vale IGUALMENTE em caixa alta:
  escreva "NÃO", "É", "SÓ" -- e nunca "NAO", "E", "SO". Texto sem acento vai
  direto para a arte do post e queima a credibilidade da marca do assinante.
- MAIUSCULA: titulo e legenda comecam com letra maiuscula. Nunca escreva
  tudo em caixa baixa.
- NUMERO: nunca invente estatistica, percentual ou valor ("50% de desconto",
  "3x mais vendas"). Se nao for fato verificavel, escreva sem numero.
- VALOR NUTRICIONAL: nunca cite caloria, grama de macronutriente ou
  porcentagem de nutriente -- voce nao tem tabela de composicao e chutaria o
  numero. Fale de COMPOSICAO e funcao ("fonte de proteina", "rico em fibra").
  ATENCAO: medida de PREPARO e permitida e desejavel ("uma colher de aveia",
  "meia xicara", "duas fatias") -- isso e receita, nao valor nutricional.
- EXPERIENCIA: nunca invente vivencia de quem assina o post. Nada de "essa
  semana um cliente", "atendi uma pessoa que", "no meu consultorio". Voce nao
  sabe o que essa pessoa viveu, e caso inventado desmorona no primeiro
  comentario pedindo detalhe. Use observacao geral: "e comum", "costuma
  acontecer".
- Nunca prometa ganho financeiro, resultado garantido, cura ou emagrecimento.
- Nunca use "link na bio" como unico CTA, nem clickbait vazio.
- Nada de emoji em excesso: no maximo 2 por legenda.
- NAO abrevie termo do nicho por iniciais ("IA" para introducao alimentar,
  "AF" para atividade fisica). Escreva por extenso: a sigla confunde com
  outra coisa e o leitor nao tem contexto.
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

/**
 * O bloco de identidade de quem assina os posts.
 *
 * Quando ha DNA, ele MANDA no publico e no tom -- o do nicho e so o padrao
 * de quem ainda nao preencheu. Deixar os dois lado a lado, com o mesmo peso,
 * faria o modelo escolher o mais generico, que e sempre o mais facil.
 */
function blocoIdentidade({ nicho, dna }) {
  // Cor nao e texto: quem preencheu so a paleta nao descreveu identidade
  // nenhuma, e um bloco vazio seguido de "escreva como essa pessoa" mandaria
  // o modelo inventar quem ela e.
  const TEXTUAIS = ['quem', 'publico', 'metodo', 'nao_aborda', 'diferenciais', 'ofertas', 'tom'];
  const temTexto = dna && TEXTUAIS.some((c) => String(dna[c] ?? '').trim());

  if (!temTexto) {
    return `PUBLICO: ${nicho.publico}\nTOM DE VOZ: ${nicho.tomDeVoz}`;
  }

  const campos = [
    ['QUEM ASSINA', dna.quem],
    ['PUBLICO', dna.publico || nicho.publico],
    ['METODO E JEITO DE TRABALHAR', dna.metodo],
    ['DIFERENCIAIS', dna.diferenciais],
    ['OFERTAS E PRODUTOS', dna.ofertas],
    ['TOM DE VOZ', dna.tom || nicho.tomDeVoz],
  ]
    .filter(([, v]) => String(v ?? '').trim())
    .map(([r, v]) => `${r}: ${String(v).trim()}`)
    .join('\n');

  const proibidos = String(dna.nao_aborda ?? '').trim();

  return `${campos}
${proibidos ? `\nASSUNTOS QUE ESTA MARCA NAO ABORDA - nao escreva sobre nada disso, nem de passagem: ${proibidos}` : ''}
OS DIFERENCIAIS ACIMA SAO LIMITE, NAO SO ASSUNTO. Nada no post pode
contradizer o que essa pessoa defende -- quem diz ser contra contagem de
caloria nao pode explicar nada por "balanco calorico", nem de passagem.
Se o tema sorteado so fizer sentido pelo caminho que ela rejeita, escreva
sobre ele pelo angulo DELA.
ESCREVA COMO ESSA PESSOA, NAO COMO UM PERFIL GENERICO DO NICHO. O texto tem
que ser reconhecivel: se ele pudesse ser publicado por qualquer concorrente
da mesma area, esta errado. Use o metodo e os diferenciais acima como fonte
do que dizer.

LIMITE DO QUE VOCE SABE: o que esta escrito aqui em cima e TUDO que se sabe
sobre essa pessoa. Ter recebido uma identidade nao autoriza inventar o resto
dela. E PROIBIDO criar credencial, formacao, tempo de carreira, numero de
clientes, premio, caso de atendimento -- e tambem cena domestica ou episodio
pessoal ("na minha casa sempre foi assim", "lembro quando minha mae..."),
ainda que combine com o perfil. Para dar concretude, use o metodo e os
exemplos ja descritos acima, ou fale na forma geral e reconhecivel.`;
}

function montarPrompt({
  nicho,
  marca,
  quantidade,
  jaGerados = [],
  temas = [],
  evidencias = null,
  dna = null,
}) {
  return `Gere ${quantidade} posts de Instagram para a marca "${marca}", no nicho "${nicho.nome}".

${blocoIdentidade({ nicho, dna })}
TEMAS DESTE BLOCO - use EXATAMENTE um post por tema, na ordem abaixo:
${temas
  .map((t, i) => {
    const artigos = evidencias?.get(t);
    if (!artigos?.length) return `${i + 1}. ${t}`;
    return `${i + 1}. ${t}
   ESTUDOS DISPONIVEIS para este tema. Escreva o post a partir do que eles
   dizem e informe em "artigo" qual usou, ou 0 se nenhum tratar do assunto:
${artigos.map((a, j) => `   [${j + 1}] ${a.titulo} (${a.revista}, ${a.ano})\n       ${a.resumo}`).join('\n')}`;
  })
  .join('\\n')}
${nicho.observacoes ? `\nATENCAO ESPECIFICA DESTE NICHO: ${nicho.observacoes}` : ''}

Responda APENAS um objeto JSON, sem texto em volta, neste formato:
{
  "posts": [
    {
      "formato": "citacao" | "destaque" | "lista" | "carrossel",
      "titulo": "O GANCHO, que vai na imagem. Maximo 10 palavras. Faz parar de rolar, nao descreve o assunto. Sem ponto final. ACENTUACAO OBRIGATORIA tambem aqui: 'alimentação', 'criança', 'você' -- o titulo vai impresso na arte, sem acento fica visivelmente errado.",
      "subtitulo": "1 linha de apoio na imagem, max 12 palavras. Use so no formato destaque.",
      "itens": ["usado SO no formato lista: 3 a 4 itens, max 8 palavras cada"],
      "slides": [{"titulo": "max 6 palavras", "texto": "1 a 2 frases curtas, com a ancora concreta"}],
      "legenda": "NO MAXIMO 4 FRASES. Conte antes de responder: mais de 4 esta errado. A primeira completa o gancho (nao repete o titulo). As outras entregam a ancora concreta - o alimento, a medida, o momento ou o passo. Legenda longa nao e lida: corte tudo que nao ensina.",
      "hashtags": ["7 a 10 hashtags em minusculo, sem #, misturando amplas e especificas"],
      "cta": "1 frase curta de chamada para acao, natural, sem 'link na bio'",
      "buscaCientifica": "OBRIGATORIO neste nicho -- nunca deixe nulo. 3 a 6 palavras EM INGLES para achar o estudo no PubMed. Termos tecnicos, nao coloquiais. Bom: 'added sugar infants complementary feeding'. Ruim: 'is sugar bad for babies'.",
      "buscaImagem": "UMA unica busca de 2 a 4 palavras EM INGLES, sem virgula e sem alternativas. Descreva o OBJETO concreto, nunca o conceito. Bom: 'school lunchbox fruit'. Ruim: 'healthy lifestyle' ou 'eggs, lentils, sardines'.",
      "artigo": "SO quando o tema trouxer ESTUDOS DISPONIVEIS: o numero do estudo em que baseou o post, ou 0 se nenhum servir. Diga apenas o que esta no resumo."
    }
  ]
}

O campo "slides" e usado SO no formato carrossel: 3 a 4 slides de miolo, um
por ideia, em ordem que faca sentido lido em sequencia. A capa e o fechamento
sao montados automaticamente a partir do titulo e do cta -- NAO os inclua.

Distribua os formatos ao longo do lote. Use "carrossel" em cerca de 1 a cada 4
posts: ele da mais alcance, mas exige assunto que se desdobre em etapas.${
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

  // Carrossel sem miolo nao e carrossel. Melhor virar post unico do que
  // gerar uma sequencia de capa + fechamento sem conteudo no meio.
  const formato =
    p.formato === 'carrossel' && !(Array.isArray(p.slides) && p.slides.length >= 2)
      ? 'destaque'
      : p.formato || 'destaque';

  return {
    formato,
    titulo: p.titulo.trim(),
    subtitulo: p.subtitulo?.trim() || null,
    itens: Array.isArray(p.itens) ? p.itens.filter(Boolean) : [],
    slides: Array.isArray(p.slides)
      ? p.slides
          .filter((s) => s?.titulo && s?.texto)
          .slice(0, 5)
          .map((s) => ({ titulo: String(s.titulo).trim(), texto: String(s.texto).trim() }))
      : [],
    legenda: p.legenda.trim(),
    hashtags,
    cta: p.cta?.trim() || null,
    buscaImagem: normalizarBusca(p.buscaImagem),
    buscaCientifica: p.buscaCientifica?.trim() || null,
    fonte: p._fonte ?? null,
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

  // O DNA e opcional: quem ainda nao preencheu continua gerando com o perfil
  // padrao do nicho. E se o banco estiver fora, o pacote sai generico em vez
  // de nao sair -- perder a geracao inteira por causa de um campo de apoio
  // seria pior que o texto sair menos afiado.
  let dna = null;
  try {
    dna = await dnaDaMarca(assinanteId, marca);
  } catch (erro) {
    console.error('[postei] nao consegui ler o DNA da marca:', erro.message);
  }

  // As cores tambem vem do DNA. Sem elas, dois assinantes do mesmo nicho
  // teriam feeds identicos, mudando so o nome no rodape.
  const paleta = paletaDaMarca(nicho, dna);

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
    const temasDoBloco = sortearTemas(nicho.temas, pedir, temasUsados);

    // A evidencia vem ANTES da escrita nos nichos que pedem.
    const evidencias = nicho.evidencia
      ? await evidenciaDosTemas(temasDoBloco, assinanteId)
      : null;

    try {
      const { conteudo, uso } = await chamarLLM({
        sistema: SISTEMA,
        prompt: montarPrompt({
          nicho,
          marca,
          quantidade: pedir,
          jaGerados: bruto,
          temas: temasDoBloco,
          evidencias,
          dna,
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

      for (const [j, p] of lista.entries()) {
        if (bruto.length >= qtd) break;
        const chave = chaveTitulo(p?.titulo);
        if (!chave || vistos.has(chave)) continue;
        vistos.add(chave);

        // Amarra o post ao artigo que o sustenta. O indice vem do modelo,
        // mas a referencia em si vem da busca -- ele nao inventa nada.
        const artigos = evidencias?.get(temasDoBloco[j]);
        const escolhido = Number(p?.artigo);
        if (artigos?.length && escolhido >= 1 && escolhido <= artigos.length) {
          const a = artigos[escolhido - 1];
          p._fonte = { titulo: a.titulo, revista: a.revista, ano: a.ano, url: a.url };
        }

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
    const usaraFoto = comFoto && post.formato !== 'lista';  // carrossel usa foto so na capa
    const foto = usaraFoto ? await buscarFoto({ consulta: post.buscaImagem }) : null;

    const numero = String(i + 1).padStart(2, '0');
    let arquivo;
    let imagens = null;
    let formato;

    if (post.formato === 'carrossel') {
      const r = await gerarCarrossel({ post, nicho, marca, foto, paleta });
      formato = r.formato;
      // Um arquivo por slide, numerado na ordem de exibicao. O primeiro
      // tambem e a "capa" usada nas listagens.
      imagens = [];
      for (const [s, img] of r.imagens.entries()) {
        const nome = `post-${numero}-${String(s + 1).padStart(2, '0')}.${r.extensao}`;
        await fs.writeFile(path.join(dirLote, nome), img);
        imagens.push(nome);
      }
      arquivo = imagens[0];
    } else {
      const r = await gerarCriativo({ post, nicho, marca, foto, paleta });
      formato = r.formato;
      arquivo = `post-${numero}.${r.extensao}`;
      await fs.writeFile(path.join(dirLote, arquivo), r.imagem);
    }

    resultado.push({
      ...post,
      formato,
      // So registra a foto se o layout realmente a usou.
      foto: (formato === 'foto' || formato === 'carrossel') && foto
        ? { autor: foto.autor, origem: foto.origem }
        : null,
      // Lista de slides do carrossel; nulo nos demais formatos.
      imagens,
      imagem: arquivo,
      textoParaColar: [
        post.legenda,
        post.cta,
        // A fonte vai ANTES das hashtags: depois delas ninguem le.
        post.fonte &&
          `Fonte: ${post.fonte.titulo} (${post.fonte.revista}, ${post.fonte.ano}) - ${post.fonte.url}`,
        post.hashtags.map((h) => `#${h}`).join(' '),
      ]
        .filter(Boolean)
        .join('\n\n'),
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

/**
 * Traduz temas em consultas de busca no PubMed.
 *
 * Uma chamada curta por bloco. Os temas sao nossos e estao em portugues
 * coloquial ("por que dieta restritiva nao dura"); o PubMed indexa termo
 * tecnico em ingles.
 */
async function consultasParaTemas(temas, assinanteId) {
  const prompt = `Para cada tema abaixo, escreva UMA consulta de busca no PubMed.
Termo tecnico em ingles, 3 a 6 palavras, sem operadores nem aspas.

${temas.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Responda APENAS: {"consultas": ["...", "..."]} na mesma ordem.`;

  try {
    const { conteudo } = await chamarLLM({ prompt, assinanteId, json: true });
    const lista = extrairJSON(conteudo)?.consultas;
    return Array.isArray(lista) ? lista.map((c) => String(c).trim()) : [];
  } catch (erro) {
    console.warn(`[postei] tradução dos temas falhou: ${erro.message}`);
    return [];
  }
}

/**
 * Busca a evidencia ANTES de escrever o post.
 *
 * Esta ordem e o ponto todo. Escrever primeiro e procurar estudo depois e
 * buscar respaldo para uma conclusao pronta -- o PubMed devolve o artigo
 * mais parecido, nao o que sustenta, e sai fonte real de outro assunto.
 * Buscando antes, o post nasce ancorado no que o resumo realmente diz.
 */
async function evidenciaDosTemas(temas, assinanteId) {
  const consultas = await consultasParaTemas(temas, assinanteId);
  if (consultas.length === 0) return new Map();

  const porTema = new Map();
  for (const [i, tema] of temas.entries()) {
    const artigos = await buscarEvidencia(consultas[i], 2);
    if (artigos.length) porTema.set(tema, artigos);
  }
  return porTema;
}
