import fs from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { config } from './config.js';

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
function rodape(paleta, marca) {
  return div({ alignItems: 'center', gap: 20 }, [
    div({ width: 56, height: 6, backgroundColor: paleta.destaque, borderRadius: 3 }, []),
    div({ fontSize: 30, color: paleta.texto, opacity: 0.75, letterSpacing: 0.5 }, marca),
  ]);
}

/**
 * Esqueleto unico dos criativos: o conteudo ocupa a area flexivel e fica
 * centralizado nela; o rodape encosta na base. Antes cada layout resolvia
 * isso sozinho e o 'marginTop: auto' do rodape brigava com o
 * 'justifyContent: center' do pai, abrindo um vao morto no meio da arte.
 */
function moldura(paleta, marca, conteudo) {
  return div({ ...BASE, backgroundColor: paleta.fundo }, [
    div({ flexDirection: 'column', flex: 1, justifyContent: 'center' }, conteudo),
    rodape(paleta, marca),
  ]);
}

function layoutCitacao(post, paleta, marca) {
  return moldura(paleta, marca, [
    div({ fontSize: 130, lineHeight: 0.9, color: paleta.destaque, fontWeight: 700 }, '“'),
    div(
      { fontSize: 68, lineHeight: 1.25, color: paleta.texto, fontWeight: 700, marginTop: 10 },
      post.titulo,
    ),
  ]);
}

function layoutDestaque(post, paleta, marca) {
  // Primeira palavra na cor de destaque: cria hierarquia sem precisar de
  // um segundo elemento grafico.
  const [primeira, ...resto] = post.titulo.split(' ');
  return moldura(paleta, marca, [
    div({ flexWrap: 'wrap', gap: 16 }, [
      div({ fontSize: 82, fontWeight: 700, color: paleta.destaque, lineHeight: 1.15 }, primeira),
      div({ fontSize: 82, fontWeight: 700, color: paleta.texto, lineHeight: 1.15 }, resto.join(' ')),
    ]),
    ...(post.subtitulo
      ? [
          div(
            { fontSize: 38, color: paleta.texto, opacity: 0.8, marginTop: 36, lineHeight: 1.4 },
            post.subtitulo,
          ),
        ]
      : []),
  ]);
}

function layoutLista(post, paleta, marca) {
  const itens = (post.itens || []).slice(0, 4);
  return moldura(paleta, marca, [
    div({ fontSize: 62, fontWeight: 700, color: paleta.texto, lineHeight: 1.2 }, post.titulo),
    div(
      { flexDirection: 'column', gap: 30, marginTop: 52 },
      itens.map((item, i) =>
        div({ alignItems: 'flex-start', gap: 24 }, [
          div(
            {
              fontSize: 36,
              fontWeight: 700,
              color: paleta.fundo,
              backgroundColor: paleta.destaque,
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
            String(i + 1),
          ),
          div({ fontSize: 38, color: paleta.texto, lineHeight: 1.35, flex: 1 }, item),
        ]),
      ),
    ),
  ]);
}

/**
 * Layout com fotografia. A foto ocupa a parte de cima e o texto vive num
 * painel solido embaixo -- em vez de escrever POR CIMA da imagem.
 *
 * Escrever sobre a foto exige veu escuro e ainda assim quebra quando a foto
 * vem clara ou visualmente ruidosa, o que e frequente em banco de imagem.
 * Com painel separado a legibilidade nao depende da foto sorteada.
 */
function layoutFoto(post, paleta, marca, foto) {
  const alturaFoto = Math.round(config.criativo.altura * config.foto.alturaFoto);

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
        padding: 72,
        justifyContent: 'center',
        backgroundColor: paleta.fundo,
      },
      [
        div(
          { fontSize: 62, fontWeight: 700, color: paleta.texto, lineHeight: 1.18 },
          post.titulo,
        ),
        ...(post.subtitulo
          ? [
              div(
                { fontSize: 34, color: paleta.texto, opacity: 0.78, marginTop: 22, lineHeight: 1.4 },
                post.subtitulo,
              ),
            ]
          : []),
        div({ marginTop: 34 }, [rodape(paleta, marca)]),
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
function slideCapa(post, paleta, marca, foto) {
  const conteudo = [
    div({ flexWrap: 'wrap', gap: 14 }, [
      div({ fontSize: 76, fontWeight: 700, color: paleta.texto, lineHeight: 1.12 }, post.titulo),
    ]),
    // Indicacao de arrastar: sem ela o carrossel perde metade do alcance,
    // porque a pessoa nao sabe que ha mais.
    div({ alignItems: 'center', gap: 12, marginTop: 34 }, [
      div(
        {
          fontSize: 26,
          color: paleta.fundo,
          backgroundColor: paleta.destaque,
          borderRadius: 26,
          padding: '10px 22px',
          fontWeight: 700,
        },
        'arrasta →',
      ),
    ]),
  ];

  if (foto?.dataUri) {
    const alturaFoto = Math.round(config.criativo.altura * 0.42);
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
          { flexDirection: 'column', flex: 1, padding: 72, justifyContent: 'center' },
          conteudo,
        ),
      ],
    );
  }

  return moldura(paleta, marca, conteudo);
}

function slideConteudo(slide, indice, total, paleta, marca) {
  return moldura(paleta, marca, [
    div({ alignItems: 'baseline', gap: 14 }, [
      div({ fontSize: 90, fontWeight: 700, color: paleta.destaque, lineHeight: 1 }, String(indice)),
      div({ fontSize: 26, color: paleta.texto, opacity: 0.45 }, `de ${total}`),
    ]),
    div(
      { fontSize: 56, fontWeight: 700, color: paleta.texto, lineHeight: 1.2, marginTop: 26 },
      slide.titulo,
    ),
    div(
      { fontSize: 36, color: paleta.texto, opacity: 0.82, lineHeight: 1.42, marginTop: 22 },
      slide.texto,
    ),
  ]);
}

function slideFecho(post, paleta, marca) {
  return moldura(paleta, marca, [
    div(
      { fontSize: 62, fontWeight: 700, color: paleta.texto, lineHeight: 1.2 },
      post.cta || 'Salve para consultar depois',
    ),
    div(
      { fontSize: 34, color: paleta.destaque, marginTop: 26, fontWeight: 600 },
      marca,
    ),
  ]);
}

/** Devolve a árvore de cada slide, na ordem: capa, miolo, fechamento. */
export function montarSlides(post, paleta, marca, foto) {
  const miolo = (post.slides || []).slice(0, 5);
  return [
    slideCapa(post, paleta, marca, foto),
    ...miolo.map((s, i) => slideConteudo(s, i + 1, miolo.length, paleta, marca)),
    slideFecho(post, paleta, marca),
  ];
}

const LAYOUTS = {
  citacao: layoutCitacao,
  destaque: layoutDestaque,
  lista: layoutLista,
};

/** Converte uma árvore em JPEG. É o passo final de todo criativo. */
async function renderizar(arvore, fontes, comFoto) {
  const svg = await satori(arvore, {
    width: config.criativo.largura,
    height: config.criativo.altura,
    fonts: fontes,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: config.criativo.largura },
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
export async function gerarCarrossel({ post, nicho, marca, foto = null, paleta = null }) {
  const fontes = await carregarFontes();
  const arvores = montarSlides(post, paleta ?? nicho.paleta, marca, foto);

  const imagens = [];
  for (const [i, arvore] of arvores.entries()) {
    imagens.push(await renderizar(arvore, fontes, i === 0 && Boolean(foto?.dataUri)));
  }
  return { imagens, extensao: 'jpg', formato: 'carrossel' };
}

export async function gerarCriativo({ post, nicho, marca, foto = null, paleta = null }) {
  const fontes = await carregarFontes();
  // A paleta da marca quando ha; a do nicho e o padrao de quem nao escolheu.
  const cores = paleta ?? nicho.paleta;

  // Lista sem itens vira citacao: melhor trocar de layout do que renderizar
  // uma lista vazia e entregar um post quebrado ao assinante.
  let formato = post.formato && LAYOUTS[post.formato] ? post.formato : 'destaque';
  if (formato === 'lista' && !(post.itens?.length > 0)) formato = 'citacao';

  // A lista precisa dos proprios itens visiveis, entao nao cede espaco para
  // a foto; nos outros formatos a foto substitui o fundo chapado.
  const usaFoto = Boolean(foto?.dataUri) && formato !== 'lista';
  if (usaFoto) formato = 'foto';

  const arvore = usaFoto
    ? layoutFoto(post, cores, marca, foto)
    : LAYOUTS[formato](post, cores, marca);

  const imagem = await renderizar(arvore, fontes, usaFoto);
  return { imagem, extensao: 'jpg', formato };
}
