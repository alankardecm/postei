/**
 * Busca de evidência científica no PubMed (E-utilities, sem chave).
 *
 * Existe por um motivo de segurança, não de recurso: pedir ao modelo que
 * "cite estudos" produz REFERÊNCIA INVENTADA -- autor, revista e ano
 * plausíveis para um artigo que não existe. Assinado por uma nutricionista,
 * isso é muito pior que um post genérico.
 *
 * Aqui a referência vem de uma busca real. O modelo só pode falar sobre o
 * resumo que recebeu, e o que sai é conferível pelo PMID.
 */

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/** O NCBI pede identificação da aplicação nas chamadas. */
const FERRAMENTA = 'tool=postei&email=alanmoreiraconsultoria@gmail.com';

const TEMPO_LIMITE = 20000;

/** Cache em memória: temas se repetem entre lotes e o NCBI pede moderação. */
const cache = new Map();

async function buscarJson(url) {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE) });
  if (!resposta.ok) throw new Error(`PubMed devolveu HTTP ${resposta.status}`);
  return resposta.json();
}

/**
 * Devolve até `quantos` artigos com título, revista, ano e resumo.
 * Nunca lança: evidência é enriquecimento, e falha nela não pode derrubar
 * a geração do pacote.
 */
export async function buscarEvidencia(consulta, quantos = 2) {
  if (!consulta) return [];

  const chave = `${consulta}|${quantos}`;
  if (cache.has(chave)) return cache.get(chave);

  try {
    // Duas tentativas: primeiro o filtro rigoroso (revisão, meta-análise ou
    // ensaio, em humanos); se não achar nada, afrouxa para humanos apenas.
    // Com o filtro rigoroso sozinho, 2 de 3 buscas voltavam vazias e o post
    // ficava sem fonte -- pior que uma fonte um pouco menos forte.
    const filtros = [
      '(review[pt] OR meta-analysis[pt] OR randomized controlled trial[pt]) AND humans[mh]',
      'humans[mh]',
    ];

    let ids = [];
    for (const filtro of filtros) {
      const termo = encodeURIComponent(`${consulta} AND ${filtro}`);
      const busca = await buscarJson(
        `${BASE}/esearch.fcgi?db=pubmed&term=${termo}&retmax=${quantos}` +
          `&retmode=json&sort=relevance&reldate=3650&datetype=pdat&${FERRAMENTA}`,
      );
      ids = busca?.esearchresult?.idlist ?? [];
      if (ids.length) break;
    }
    if (ids.length === 0) {
      cache.set(chave, []);
      return [];
    }

    const resumoJson = await buscarJson(
      `${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json&${FERRAMENTA}`,
    );

    // O abstract não vem no esummary; precisa do efetch, que devolve texto.
    const abstractos = await fetch(
      `${BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=text&${FERRAMENTA}`,
      { signal: AbortSignal.timeout(TEMPO_LIMITE) },
    ).then((r) => (r.ok ? r.text() : ''));

    const artigos = ids.map((pmid, i) => {
      const a = resumoJson?.result?.[pmid] ?? {};
      return {
        pmid,
        titulo: a.title?.replace(/\.$/, '') ?? '',
        revista: a.fulljournalname ?? a.source ?? '',
        ano: String(a.pubdate ?? '').slice(0, 4),
        // Reparte o texto do efetch entre os artigos, na ordem pedida.
        resumo: recortarAbstract(abstractos, i, ids.length),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    });

    const uteis = artigos.filter((a) => a.titulo);
    cache.set(chave, uteis);
    return uteis;
  } catch (erro) {
    console.warn(`[postei] busca científica falhou (${consulta}): ${erro.message}`);
    return [];
  }
}

/**
 * O efetch devolve os artigos concatenados em texto corrido, separados por
 * linha em branco dupla. Recorta o trecho do artigo pedido e corta em
 * tamanho que caiba no prompt sem dominá-lo.
 */
function recortarAbstract(texto, indice, total) {
  if (!texto) return '';
  const partes = texto.split(/\n\n(?=\d+\.\s)/).filter((p) => p.trim());
  const parte = partes.length === total ? partes[indice] : texto;
  return parte.replace(/\s+/g, ' ').trim().slice(0, 1200);
}
