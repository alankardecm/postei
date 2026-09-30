import fs from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { config } from './config.js';
import { TELAS } from './rede.js';
import {
  MARCA_VISUAL as MV,
  GRADE_PADRAO,
  carregarFotosGrade,
  textoBotao,
  FORMATOS_ANUNCIO,
} from './anuncio.js';
import { gerarAnuncioIa } from './imagem-ia.js';

function telaPadrao(tela) {
  return tela?.largura && tela?.altura ? tela : TELAS.instagram;
}

function n(valor, tela) {
  return Math.round(valor * (telaPadrao(tela).altura / 1350));
}

/**
 * M1 - Geracao do criativo pela ROTA A: template programatico.
 *
 * Custo: R$ 0,00 por imagem. Essa e a decisao que faz o plano Essencial
 * (R$ 39,90) fechar a conta -- IA de imagem custaria ~R$ 13/assinante/mes
 * a 60 posts, e por isso fica como cota fechada do Profissional pra cima.
 *
 * Usamos satori + resvg de proposito: os dois recebem o arquivo da fonte
 * direto e convertem texto em vetor. A VPS nao tem fontconfig instalado
 * (fc-list ausente, 0 fontes registradas), entao qualquer rota que dependa
 * de fonte do sistema renderiza texto invisivel.
 */

let fontesCache = null;

async function carregarFontes() {
  if (fontesCache) return fontesCache;
  try {
    const [regular, bold] = await Promise.all([
      fs.readFile(config.criativo.fonteRegular),
      fs.readFile(config.criativo.fonteBold),
    ]);
    fontesCache = [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    ];
    return fontesCache;
  } catch (erro) {
    throw new Error(
      `Fontes nao encontradas em assets/fontes (${erro.code}). ` +
        'Rode: npm run baixar-fontes',
    );
  }
}

// O satori exige 'display' explicito em todo div com mais de um filho.
// Injetar aqui evita repetir a propriedade em cada no dos layouts -- e
// esquecer em um so quebra a geracao inteira do lote.
const div = (style, children) => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

const BASE = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  padding: 90,
  fontFamily: 'Inter',
};

/** Barra de destaque + assinatura da marca, comum a todos os layouts. */
function rodape(paleta, marca, tela) {
  return div({ alignItems: 'center', gap: n(20, tela) }, [
    div({ width: n(56, tela), height: n(6, tela), backgroundColor: paleta.destaque, borderRadius: 3 }, []),
    div({ fontSize: n(30, tela), color: paleta.texto, opacity: 0.75, letterSpacing: 0.5 }, marca),
  ]);
}

/**
 * Esqueleto unico dos criativos: o conteudo ocupa a area flexivel e fica
 * centralizado nela; o rodape encosta na base. Antes cada layout resolvia
 * isso sozinho e o 'marginTop: auto' do rodape brigava com o
 * 'justifyContent: center' do pai, abrindo um vao morto no meio da arte.
 */
function moldura(paleta, marca, conteudo, tela) {
  return div({ ...BASE, padding: n(90, tela), backgroundColor: paleta.fundo }, [
    div({ flexDirection: 'column', flex: 1, justifyContent: 'center' }, conteudo),
    rodape(paleta, marca, tela),
  ]);
}

function layoutCitacao(post, paleta, marca, tela) {
  return moldura(paleta, marca, [
    div({ fontSize: n(130, tela), lineHeight: 0.9, color: paleta.destaque, fontWeight: 700 }, '“'),
    div(
      { fontSize: n(68, tela), lineHeight: 1.25, color: paleta.texto, fontWeight: 700, marginTop: n(10, tela) },
      post.titulo,
    ),
  ], tela);
}

function layoutDestaque(post, paleta, marca, tela) {
  const [primeira, ...resto] = post.titulo.split(' ');
  return moldura(paleta, marca, [
    div({ flexWrap: 'wrap', gap: n(16, tela) }, [
      div({ fontSize: n(82, tela), fontWeight: 700, color: paleta.destaque, lineHeight: 1.15 }, primeira),
      div({ fontSize: n(82, tela), fontWeight: 700, color: paleta.texto, lineHeight: 1.15 }, resto.join(' ')),
    ]),
    ...(post.subtitulo
      ? [
          div(
            { fontSize: n(38, tela), color: paleta.texto, opacity: 0.8, marginTop: n(36, tela), lineHeight: 1.4 },
            post.subtitulo,
          ),
        ]
      : []),
  ], tela);
}

function layoutLista(post, paleta, marca, tela) {
  const itens = (post.itens || []).slice(0, 4);
  return moldura(paleta, marca, [
    div({ fontSize: n(62, tela), fontWeight: 700, color: paleta.texto, lineHeight: 1.2 }, post.titulo),
    div(
      { flexDirection: 'column', gap: n(30, tela), marginTop: n(52, tela) },
      itens.map((item, i) =>
        div({ alignItems: 'flex-start', gap: n(24, tela) }, [
          div(
            {
              fontSize: n(36, tela),
              fontWeight: 700,
              color: paleta.fundo,
              backgroundColor: paleta.destaque,
              width: n(60, tela),
              height: n(60, tela),
              borderRadius: n(30, tela),
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
            String(i + 1),
          ),
          div({ fontSize: n(38, tela), color: paleta.texto, lineHeight: 1.35, flex: 1 }, item),
        ]),
      ),
    ),
  ], tela);
}

/**
 * Layout com fotografia. A foto ocupa a parte de cima e o texto vive num
 * painel solido embaixo -- em vez de escrever POR CIMA da imagem.
 *
 * Escrever sobre a foto exige veu escuro e ainda assim quebra quando a foto
 * vem clara ou visualmente ruidosa, o que e frequente em banco de imagem.
 * Com painel separado a legibilidade nao depende da foto sorteada.
 */
function layoutFoto(post, paleta, marca, foto, tela) {
  const t = telaPadrao(tela);
  const alturaFoto = Math.round(t.altura * config.foto.alturaFoto);

  return div({ flexDirection: 'column', width: '100%', height: '100%', backgroundColor: paleta.fundo }, [
    div({ width: '100%', height: alturaFoto, overflow: 'hidden' }, [
      {
        type: 'img',
        props: {
          src: foto.dataUri,
          style: { width: '100%', height: alturaFoto, objectFit: 'cover' },
        },
      },
    ]),
    div(
      {
        flexDirection: 'column',
        flex: 1,
        padding: n(72, t),
        justifyContent: 'center',
        backgroundColor: paleta.fundo,
      },
      [
        div(
          { fontSize: n(62, t), fontWeight: 700, color: paleta.texto, lineHeight: 1.18 },
          post.titulo,
        ),
        ...(post.subtitulo
          ? [
              div(
                { fontSize: n(34, t), color: paleta.texto, opacity: 0.78, marginTop: n(22, t), lineHeight: 1.4 },
                post.subtitulo,
              ),
            ]
          : []),
        div({ marginTop: n(34, t) }, [rodape(paleta, marca, t)]),
      ],
    ),
  ]);
}

/**
 * Slides do carrossel.
 *
 * A capa e o fechamento sao montados aqui, nao pelo modelo: sao sempre o
 * gancho e a chamada, e deixar isso por conta dele so cria variacao onde a
 * estrutura deveria ser fixa. O modelo escreve apenas o miolo.
 */
function slideCapa(post, paleta, marca, foto, tela) {
  const t = telaPadrao(tela);
  const puxar = t.id === 'linkedin' ? 'desliza →' : 'arrasta →';
  const conteudo = [
    div({ flexWrap: 'wrap', gap: n(14, t) }, [
      div({ fontSize: n(76, t), fontWeight: 700, color: paleta.texto, lineHeight: 1.12 }, post.titulo),
    ]),
    div({ alignItems: 'center', gap: n(12, t), marginTop: n(34, t) }, [
      div(
        {
          fontSize: n(26, t),
          color: paleta.fundo,
          backgroundColor: paleta.destaque,
          borderRadius: n(26, t),
          padding: `${n(10, t)}px ${n(22, t)}px`,
          fontWeight: 700,
        },
        puxar,
      ),
    ]),
  ];

  if (foto?.dataUri) {
    const alturaFoto = Math.round(t.altura * 0.42);
    return div(
      { flexDirection: 'column', width: '100%', height: '100%', backgroundColor: paleta.fundo },
      [
        div({ width: '100%', height: alturaFoto, overflow: 'hidden' }, [
          {
            type: 'img',
            props: {
              src: foto.dataUri,
              style: { width: '100%', height: alturaFoto, objectFit: 'cover' },
            },
          },
        ]),
        div(
          { flexDirection: 'column', flex: 1, padding: n(72, t), justifyContent: 'center' },
          conteudo,
        ),
      ],
    );
  }

  return moldura(paleta, marca, conteudo, t);
}

function slideConteudo(slide, indice, total, paleta, marca, tela) {
  return moldura(paleta, marca, [
    div({ alignItems: 'baseline', gap: n(14, tela) }, [
      div({ fontSize: n(90, tela), fontWeight: 700, color: paleta.destaque, lineHeight: 1 }, String(indice)),
      div({ fontSize: n(26, tela), color: paleta.texto, opacity: 0.45 }, `de ${total}`),
    ]),
    div(
      { fontSize: n(56, tela), fontWeight: 700, color: paleta.texto, lineHeight: 1.2, marginTop: n(26, tela) },
      slide.titulo,
    ),
    div(
      { fontSize: n(36, tela), color: paleta.texto, opacity: 0.82, lineHeight: 1.42, marginTop: n(22, tela) },
      slide.texto,
    ),
  ], tela);
}

function slideFecho(post, paleta, marca, tela) {
  return moldura(paleta, marca, [
    div(
      { fontSize: n(62, tela), fontWeight: 700, color: paleta.texto, lineHeight: 1.2 },
      post.cta || 'Salve para consultar depois',
    ),
    div(
      { fontSize: n(34, tela), color: paleta.destaque, marginTop: n(26, tela), fontWeight: 600 },
      marca,
    ),
  ], tela);
}

function logoPostei(tela, tamanho = 52) {
  const lado = n(tamanho, tela);
  return div({ alignItems: 'center', gap: n(14, tela) }, [
    div(
      {
        width: lado,
        height: lado,
        backgroundColor: MV.verde,
        borderRadius: n(14, tela),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      },
      [
        div(
          { fontSize: n(tamanho * 0.52, tela), fontWeight: 700, color: MV.branco, lineHeight: 1 },
          'P',
        ),
      ],
    ),
    div(
      { fontSize: n(tamanho * 0.72, tela), fontWeight: 700, color: MV.preto, letterSpacing: -0.6 },
      'Postei',
    ),
  ]);
}

function palavraEmDestaque(palavra) {
  return /minuto|branco|canva|grátis|gratis|pronto|automático|automatico/i.test(palavra);
}

function headlineAnuncio(titulo, tela, tamanho = 68) {
  const palavras = String(titulo || '').trim().split(/\s+/).filter(Boolean);
  // Evita a última palavra órfã ("branco.", "minutos.") numa linha sozinha.
  if (palavras.length >= 2 && palavras[palavras.length - 1].replace(/[^\p{L}\p{N}]/gu, '').length <= 8) {
    const ultima = palavras.pop();
    palavras[palavras.length - 1] = `${palavras[palavras.length - 1]} ${ultima}`;
  }
  return div(
    {
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
    },
    palavras.map((p, i) =>
      div(
        {
          fontSize: n(tamanho, tela),
          fontWeight: 700,
          color: palavraEmDestaque(p) ? MV.verde : MV.preto,
          lineHeight: 1.12,
          letterSpacing: -1.2,
          marginRight: i === palavras.length - 1 ? 0 : n(14, tela),
        },
        p,
      ),
    ),
  );
}

function botaoCta(texto, tela) {
  return div(
    {
      backgroundColor: MV.verde,
      borderRadius: n(40, tela),
      paddingTop: n(22, tela),
      paddingBottom: n(22, tela),
      paddingLeft: n(36, tela),
      paddingRight: n(36, tela),
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    [
      div(
        { fontSize: n(32, tela), fontWeight: 700, color: MV.branco, letterSpacing: -0.3 },
        texto,
      ),
    ],
  );
}

function tileGrade(tile, lado, fotoUri) {
  if (tile.tipo === 'foto' && fotoUri) {
    return div(
      { width: lado, height: lado, overflow: 'hidden', backgroundColor: MV.cremeCard },
      [
        {
          type: 'img',
          props: {
            src: fotoUri,
            style: { width: lado, height: lado, objectFit: 'cover' },
          },
        },
      ],
    );
  }

  const titulo = tile.titulo || 'Seu mês pronto';
  return div(
    {
      width: lado,
      height: lado,
      backgroundColor: tile.fundo || MV.verdeEscuro,
      padding: Math.max(8, Math.round(lado * 0.1)),
      justifyContent: 'flex-end',
    },
    [
      div(
        {
          fontSize: Math.max(11, Math.round(lado * 0.11)),
          fontWeight: 700,
          color: tile.tinta || MV.creme,
          lineHeight: 1.2,
        },
        titulo,
      ),
    ],
  );
}

function gradeDoFeed(fotos, lado, gap) {
  const linhas = [0, 1, 2].map((linha) =>
    GRADE_PADRAO.slice(linha * 3, linha * 3 + 3).map((tile) =>
      tileGrade(tile, lado, tile.arquivo ? fotos.get(tile.arquivo) : null),
    ),
  );

  return div(
    { flexDirection: 'column', gap },
    linhas.map((linha) => div({ gap }, linha)),
  );
}

function celularComFeed(tela, fotos) {
  const largura = n(560, tela);
  const raio = n(48, tela);
  const bezel = n(12, tela);
  const telaW = largura - bezel * 2;
  const gap = n(4, tela);
  const lado = Math.floor((telaW - gap * 2) / 3);

  return div(
    {
      width: largura,
      backgroundColor: MV.phone,
      borderRadius: raio,
      padding: bezel,
      flexDirection: 'column',
    },
    [
      div(
        {
          width: telaW,
          backgroundColor: MV.tela,
          borderRadius: n(38, tela),
          overflow: 'hidden',
          flexDirection: 'column',
        },
        [
          div(
            {
              paddingTop: n(16, tela),
              paddingLeft: n(18, tela),
              paddingRight: n(18, tela),
              paddingBottom: n(10, tela),
              justifyContent: 'space-between',
              alignItems: 'center',
            },
            [
              div({ fontSize: n(18, tela), fontWeight: 700, color: MV.preto }, '9:41'),
              div({ fontSize: n(16, tela), color: MV.cinza }, '●●●'),
            ],
          ),
          div(
            {
              paddingLeft: n(16, tela),
              paddingRight: n(16, tela),
              paddingBottom: n(10, tela),
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            [
              div({ fontSize: n(22, tela), fontWeight: 700, color: MV.preto }, 'seu.perfil'),
              div({ flexDirection: 'column', gap: n(3, tela) }, [
                div({ width: n(16, tela), height: n(2, tela), backgroundColor: MV.preto }, []),
                div({ width: n(16, tela), height: n(2, tela), backgroundColor: MV.preto }, []),
                div({ width: n(16, tela), height: n(2, tela), backgroundColor: MV.preto }, []),
              ]),
            ],
          ),
          gradeDoFeed(fotos, lado, gap),
          div(
            {
              paddingTop: n(14, tela),
              paddingBottom: n(16, tela),
              justifyContent: 'space-around',
              alignItems: 'center',
            },
            [0, 1, 2, 3, 4].map((i) =>
              div(
                {
                  width: n(i === 2 ? 22 : 16, tela),
                  height: n(i === 2 ? 22 : 16, tela),
                  borderRadius: n(i === 2 ? 6 : 8, tela),
                  backgroundColor: i === 0 ? MV.preto : MV.cinza,
                  opacity: i === 0 ? 1 : 0.35,
                },
                [],
              ),
            ),
          ),
        ],
      ),
    ],
  );
}

/**
 * Anúncio hero: logo + headline + iPhone com grade de posts reais + CTA.
 * Cores da marca Postei, independentes da paleta do assinante.
 */
function layoutAnuncioProduto(post, _paleta, _marca, tela, fotos) {
  const t = telaPadrao(tela);
  const quadrado = t.largura === t.altura;
  return div(
    {
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: MV.creme,
      paddingTop: n(quadrado ? 40 : 56, t),
      paddingBottom: n(quadrado ? 36 : 48, t),
      paddingLeft: n(72, t),
      paddingRight: n(72, t),
      alignItems: 'center',
    },
    [
      logoPostei(t, 48),
      div({ height: n(28, t) }, []),
      headlineAnuncio(post.titulo, t, quadrado ? 56 : 68),
      ...(post.subtitulo
        ? [
            div(
              {
                fontSize: n(26, t),
                color: MV.cinza,
                textAlign: 'center',
                lineHeight: 1.35,
                marginTop: n(16, t),
                width: '92%',
                justifyContent: 'center',
              },
              post.subtitulo,
            ),
          ]
        : []),
      div({ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: n(20, t) }, [
        celularComFeed(t, fotos || new Map()),
      ]),
      div({ width: '100%', marginTop: n(22, t) }, [botaoCta(textoBotao(post), t)]),
      div(
        {
          fontSize: n(20, t),
          color: MV.cinza,
          marginTop: n(14, t),
          textAlign: 'center',
        },
        'Sem cartão de crédito. Cancele quando quiser.',
      ),
    ],
  );
}

/**
 * Anúncio sem o celular: headline + 3 provas + CTA.
 * Varia o feed e cabe melhor no quadrado do LinkedIn.
 */
function layoutAnuncioCta(post, _paleta, _marca, tela) {
  const t = telaPadrao(tela);
  const itens = (post.itens || []).filter(Boolean).slice(0, 4);
  const provas = itens.length
    ? itens
    : [
        '30 posts com imagem e legenda',
        'Sem Canva e sem cartão',
        'Publica no Instagram e no LinkedIn',
      ];

  return div(
    {
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: MV.creme,
      padding: n(80, t),
      justifyContent: 'center',
    },
    [
      logoPostei(t, 52),
      div({ height: n(40, t) }, []),
      headlineAnuncio(post.titulo, t, 72),
      ...(post.subtitulo
        ? [
            div(
              {
                fontSize: n(30, t),
                color: MV.cinza,
                lineHeight: 1.4,
                marginTop: n(24, t),
                width: '94%',
              },
              post.subtitulo,
            ),
          ]
        : []),
      div(
        { flexDirection: 'column', gap: n(22, t), marginTop: n(48, t) },
        provas.map((item) =>
          div({ alignItems: 'center', gap: n(16, t) }, [
            div(
              {
                width: n(36, t),
                height: n(36, t),
                borderRadius: n(18, t),
                backgroundColor: MV.verde,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              },
              [
                div({ fontSize: n(20, t), fontWeight: 700, color: MV.branco }, '✓'),
              ],
            ),
            div(
              { fontSize: n(30, t), color: MV.preto, lineHeight: 1.3, flex: 1 },
              item,
            ),
          ]),
        ),
      ),
      div({ marginTop: n(52, t) }, [botaoCta(textoBotao(post), t)]),
      div(
        { fontSize: n(22, t), color: MV.cinza, marginTop: n(18, t) },
        'Sem cartão de crédito. Cancele quando quiser.',
      ),
    ],
  );
}

/** Devolve a árvore de cada slide, na ordem: capa, miolo, fechamento. */
export function montarSlides(post, paleta, marca, foto, tela) {
  const miolo = (post.slides || []).slice(0, 5);
  return [
    slideCapa(post, paleta, marca, foto, tela),
    ...miolo.map((s, i) => slideConteudo(s, i + 1, miolo.length, paleta, marca, tela)),
    slideFecho(post, paleta, marca, tela),
  ];
}

const LAYOUTS = {
  citacao: layoutCitacao,
  destaque: layoutDestaque,
  lista: layoutLista,
  anuncioProduto: layoutAnuncioProduto,
  anuncioCta: layoutAnuncioCta,
};

/**
 * Selo do teste grátis. Pequeno, canto inferior direito, opacidade baixa:
 * quem olha o post vê a marca do assinante; quem presta atenção vê que
 * saiu do Postei. Plano pago não passa por aqui.
 */
function fundoEscuro(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

async function aplicarMarcaDagua(jpeg, tela, paleta) {
  const t = telaPadrao(tela);
  const fontes = await carregarFontes();
  const w = n(108, t);
  const h = n(28, t);
  const inset = n(26, t);
  const escuro = fundoEscuro(paleta?.fundo);
  const arvore = div(
    {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: escuro ? 'rgba(244,241,234,0.38)' : 'rgba(17,17,17,0.22)',
      borderRadius: n(14, t),
      gap: n(6, t),
      paddingLeft: n(8, t),
      paddingRight: n(10, t),
    },
    [
      div(
        {
          width: n(15, t),
          height: n(15, t),
          backgroundColor: 'rgba(22,196,90,0.62)',
          borderRadius: n(4, t),
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        [div({ fontSize: n(9, t), fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }, 'P')],
      ),
      div(
        {
          fontSize: n(13, t),
          fontWeight: 700,
          color: escuro ? 'rgba(17,17,17,0.48)' : 'rgba(255,255,255,0.62)',
          letterSpacing: -0.2,
        },
        'postei',
      ),
    ],
  );
  const svg = await satori(arvore, { width: w, height: h, fonts: fontes });
  const selo = new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng();
  const meta = await (await import('sharp')).default(jpeg).metadata();
  const left = Math.max(0, (meta.width || t.largura) - w - inset);
  const top = Math.max(0, (meta.height || t.altura) - h - inset);
  return (await import('sharp')).default(jpeg)
    .composite([{ input: selo, left, top }])
    .jpeg({ quality: 93, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

/** Converte uma árvore em JPEG. É o passo final de todo criativo. */
async function renderizar(arvore, fontes, comFoto, tela) {
  const t = telaPadrao(tela);
  const svg = await satori(arvore, {
    width: t.largura,
    height: t.altura,
    fonts: fontes,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: t.largura },
  })
    .render()
    .asPng();

  // TUDO sai em JPEG: a API do Instagram so aceita esse formato. Qualidade
  // maior no tipografico porque o JPEG cria franja em volta de letra sobre
  // cor chapada, e o 4:4:4 evita que a compressao de croma borre a borda.
  return (await import('sharp')).default(png)
    .jpeg({ quality: comFoto ? 88 : 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

/**
 * Gera todos os slides de um carrossel, na ordem de exibicao.
 * Só a capa pode ter foto; o miolo e o fechamento sao tipograficos.
 */
export async function gerarCarrossel({
  post, nicho, marca, foto = null, paleta = null, tela = null, marcaDagua = false,
}) {
  const t = telaPadrao(tela);
  const fontes = await carregarFontes();
  const arvores = montarSlides(post, paleta ?? nicho.paleta, marca, foto, t);

  const imagens = [];
  for (const [i, arvore] of arvores.entries()) {
    let img = await renderizar(arvore, fontes, i === 0 && Boolean(foto?.dataUri), t);
    if (marcaDagua) img = await aplicarMarcaDagua(img, t, paleta ?? nicho.paleta);
    imagens.push(img);
  }
  return { imagens, extensao: 'jpg', formato: 'carrossel' };
}

export async function gerarCriativo({
  post,
  nicho,
  marca,
  foto = null,
  paleta = null,
  tela = null,
  assinanteId = null,
  marcaDagua = false,
}) {
  const t = telaPadrao(tela);
  if (nicho.id === 'am-consultoria' && nicho.direcaoVisual === 'editorial-am') {
    let imagem = await gerarAnuncioIa({ post, tela: t, editorialAm: true });
    if (marcaDagua) imagem = await aplicarMarcaDagua(imagem, t, { fundo: '#080c10' });
    return { imagem, extensao: 'jpg', formato: 'amEditorial' };
  }
  let formato = post.formato && (LAYOUTS[post.formato] || post.formato === 'anuncioIa')
    ? post.formato
    : 'destaque';
  if (formato === 'lista' && !(post.itens?.length > 0)) formato = 'citacao';

  if (formato === 'anuncioIa') {
    try {
      let imagem = await gerarAnuncioIa({ post, tela: t, assinanteId });
      if (marcaDagua) imagem = await aplicarMarcaDagua(imagem, t, { fundo: MV.creme });
      return { imagem, extensao: 'jpg', formato: 'anuncioIa' };
    } catch (erro) {
      console.warn(`[postei] IA de imagem falhou, caindo no template: ${erro.message}`);
      formato = 'anuncioProduto';
    }
  }

  const fontes = await carregarFontes();
  const cores = paleta ?? nicho.paleta;

  // Anúncio de produto não recebe foto de banco: a peça já é o criativo.
  const ehAnuncio = FORMATOS_ANUNCIO.has(formato);
  const usaFoto = Boolean(foto?.dataUri) && formato !== 'lista' && !ehAnuncio;
  if (usaFoto) formato = 'foto';

  let arvore;
  if (usaFoto) {
    arvore = layoutFoto(post, cores, marca, foto, t);
  } else if (formato === 'anuncioProduto') {
    const fotos = await carregarFotosGrade();
    arvore = layoutAnuncioProduto(post, cores, marca, t, fotos);
  } else {
    arvore = LAYOUTS[formato](post, cores, marca, t);
  }

  let imagem = await renderizar(arvore, fontes, usaFoto, t);
  if (marcaDagua) imagem = await aplicarMarcaDagua(imagem, t, ehAnuncio ? { fundo: MV.creme } : cores);
  return { imagem, extensao: 'jpg', formato };
}
