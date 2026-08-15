/**
 * Hashtags de alcance.
 *
 * O modelo chuta tag genérica (#dicas, #brasil, #saude) ou repete o mesmo
 * bloco em todo o lote — os dois matam descoberta. Aqui o código monta o
 * mix: 3–5 específicas DESTE post (o que o modelo ainda acerta) + tags de
 * nicho de tamanho médio (banco curado) + 1–2 de comunidade.
 *
 * Instagram ranqueia melhor 8–10 tags certas do que 20 genéricas. LinkedIn
 * fica em 5. O conjunto muda de post para post (semente = título), senão
 * o algoritmo trata o perfil como spam de hashtag.
 */

const TETO = { instagram: 10, linkedin: 5, ambos: 10 };

/** Tags que não ranqueiam (mega) ou queimam o post (spam / irrelevante). */
const PROIBIDAS = new Set([
  'love', 'instagood', 'photooftheday', 'instadaily', 'followme', 'follow',
  'like4like', 'likeforlike', 'instamood', 'picoftheday', 'beautiful', 'happy',
  'cute', 'fashion', 'tbt', 'art', 'nature', 'style', 'fitness', 'food',
  'foodporn', 'instafood', 'yummy', 'delicious', 'brasil', 'brazil',
  'instagram', 'viral', 'fyp', 'explorepage', 'reels', 'reelsinstagram',
  'trending', 'explore', 'instagoods', 'likeforfollow', 'followforfollow',
  'dicas', 'dica', 'saude', 'saudedica', 'motivacao', 'motivational',
  'sucesso', 'empreendedorismo', 'marketingdigital', 'conteudo', 'post',
  'feed', 'stories', 'carrossel', 'publicidade',
]);

/** Banco se o nicho ainda não trouxe o campo. Mid-size, PT-BR, usáveis. */
const FALLBACK = {
  receitas: {
    nicho: [
      'receitafacil', 'receitarapida', 'comidacaseira', 'cozinhapratica',
      'jantarrapido', 'almocopratico', 'marmitada', 'receitabarata',
      'aproveitamentosobras', 'tempero', 'massafacil',
    ],
    comunidade: ['comidabrasileira', 'cozinhandoemcasa'],
  },
  'financas-pessoais': {
    nicho: [
      'organizacaofinanceira', 'controlargastos', 'reservadeemergencia',
      'sairdasdividas', 'educacaofinanceira', 'orcamentodomes',
      'dinheironamesa', 'semdivida', 'primeiroinvestimento',
    ],
    comunidade: ['financaspessoais', 'vidafinanceira'],
  },
  'nutricao-estudante': {
    nicho: [
      'alimentacaosaudavel', 'comidereal', 'refeicaosaudavel',
      'pratoequilibrado', 'comidapratica', 'marmitasaudavel',
      'lanchesaudavel', 'rotinaalimentar',
    ],
    comunidade: ['comerbem', 'vidasaudavel'],
  },
  'ia-para-empresas': {
    nicho: [
      'iaparaempresas', 'iaparanegocios', 'automatizacaodeprocessos',
      'pmebrasil', 'gestaonapratica', 'produtividadepme',
      'ferramentasdeia', 'empresapequena',
    ],
    comunidade: ['donodenegocio', 'gestaopme'],
  },
  'espiritualidade-bem-estar': {
    nicho: [
      'saudeemocional', 'praticadiaria', 'autocuidado',
      'pausaconsciente', 'respiracao', 'rotinaconsciente',
      'limitesaudavel', 'calmanapratica',
    ],
    comunidade: ['bemestaremocional', 'saudemental'],
  },
  'fe-crista': {
    nicho: [
      'vidaemcristo', 'oracaodiaria', 'devocional',
      'caminhadacrista', 'palavradedia', 'fecotidiana',
      'comunidadecrista', 'orar',
    ],
    comunidade: ['cristaos', 'vidacrista'],
  },
  'postei-marca': {
    nicho: [
      'conteudoparainstagram', 'instagramparanegocio', 'socialmedianapratica',
      'donodenegocio', 'marketinglocal', 'semcanva',
      'conteudopratico', 'feedprofissional',
    ],
    comunidade: ['pequenosnegocios', 'empreendedordigital'],
  },
};

function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sortearEstavel(lista, quantos, semente) {
  const baralho = [...lista];
  let h = hash(semente);
  for (let i = baralho.length - 1; i > 0; i -= 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  return baralho.slice(0, Math.max(0, quantos));
}

export function normalizarHashtags(lista) {
  const vistas = new Set();
  const saida = [];
  for (const bruta of lista || []) {
    const tag = String(bruta)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (tag.length < 3 || tag.length > 24 || vistas.has(tag)) continue;
    if (PROIBIDAS.has(tag)) continue;
    if (/^\d+$/.test(tag)) continue;
    vistas.add(tag);
    saida.push(tag);
  }
  return saida;
}

function bancoDoNicho(nicho) {
  const proprio = nicho?.hashtags;
  const fallback = FALLBACK[nicho?.id] || { nicho: [], comunidade: [] };
  return {
    nicho: normalizarHashtags(proprio?.nicho?.length ? proprio.nicho : fallback.nicho),
    comunidade: normalizarHashtags(
      proprio?.comunidade?.length ? proprio.comunidade : fallback.comunidade,
    ),
  };
}

/**
 * Monta o conjunto final. `doModelo` deve ser só o recorte deste post;
 * o resto sai do banco. Se o modelo vier vazio ou genérico, o banco segura.
 */
export function montarHashtags({ doModelo, nicho, titulo = '', rede = 'instagram' }) {
  const teto = TETO[rede] || TETO.instagram;
  const especificas = normalizarHashtags(doModelo).slice(0, rede === 'linkedin' ? 3 : 5);
  const usadas = new Set(especificas);
  const banco = bancoDoNicho(nicho);
  const semente = `${nicho?.id || ''}|${titulo}`;

  const meio = sortearEstavel(
    banco.nicho.filter((t) => !usadas.has(t)),
    rede === 'linkedin' ? 2 : 4,
    semente,
  );
  meio.forEach((t) => usadas.add(t));

  const social = sortearEstavel(
    banco.comunidade.filter((t) => !usadas.has(t)),
    rede === 'linkedin' ? 1 : 2,
    `${semente}|c`,
  );

  const saida = [...especificas, ...meio, ...social];
  if (saida.length === 0) {
    return banco.nicho.slice(0, teto);
  }
  return saida.slice(0, teto);
}
