import mostra from "../../public/mostra/indice.json";

/**
 * Conteudo da landing. Numeros e precos vem do plano de negocio, nao de
 * estimativa: qualquer mudanca de preco se ajusta aqui e em lugar nenhum mais.
 */

export type Criativo = {
  arquivo: string;
  nicho: string;
  nichoId: string;
  formato: string;
  titulo: string;
  comFoto: boolean;
};

export const criativos = mostra as Criativo[];

/**
 * Exemplos de ramos na seção de vitrine da landing (com arte em /mostra).
 *
 * NÃO e o catalogo do produto. O motor (`postei/nichos/*.json`) e a fonte
 * de verdade do painel. Aqui só o que queremos mostrar como amostra —
 * a capa fala "esses e muitos mais" e nao lista o inventario completo.
 */
export const nichos = [
  {
    id: "receitas",
    nome: "Receitas e culinária",
    publico: "Quem cozinha em casa e quer praticidade",
    cor: "#C6D64B",
    fundo: "#1F2410",
  },
  {
    id: "financas-pessoais",
    nome: "Finanças pessoais",
    publico: "Quem quer sair do vermelho e se organizar",
    cor: "#4ADE80",
    fundo: "#0E1B2A",
  },
  {
    id: "nutricao-estudante",
    nome: "Nutrição",
    publico: "Alimentação do dia a dia, com cuidado profissional",
    cor: "#7ED957",
    fundo: "#14251C",
  },
];

export const passos = [
  {
    titulo: "Diz o ramo",
    texto:
      "Escolhe o nicho e o nome do perfil. Sem briefing, sem reunião, sem planilha de conteúdo.",
  },
  {
    titulo: "O Postei monta o mês",
    texto:
      "Textos, fotos e artes com a sua assinatura. Em poucos minutos, não em algumas noites.",
  },
  {
    titulo: "Você revisa e publica",
    texto:
      "No painel: aprova, descarta ou ajusta. Publica ou agenda no Instagram, no LinkedIn, ou nos dois — ou baixa as artes se preferir o app.",
  },
];

export const planos = [
  {
    nome: "Essencial",
    preco: "39,90",
    resumo: "Para quem está começando a postar com constância.",
    itens: [
      "30 posts por mês",
      "1 marca",
      "Publicar e agendar no Instagram, LinkedIn ou nos dois",
      "Editar o texto antes de publicar",
    ],
    destaque: false,
  },
  {
    nome: "Profissional",
    preco: "89,90",
    resumo: "Para quem vive de aparecer e não pode sumir do feed.",
    itens: [
      "90 posts por mês",
      "Até 3 marcas",
      "Carrosséis e posts únicos",
      "Publicar e agendar no Instagram, LinkedIn ou nos dois",
      "Link de captação de contatos",
    ],
    // Marcado como recomendado, NAO como "mais escolhido": nao existe venda
    // nenhuma que comprove popularidade, e prova social inventada e o mesmo
    // problema que travamos no prompt dos posts.
    destaque: true,
  },
  {
    nome: "Estúdio",
    preco: "199,90",
    resumo: "Para agências e quem cuida do conteúdo de vários clientes.",
    // "Marca branca" saiu: o criativo NUNCA leva marca do Postei, em plano
    // nenhum -- vender isso como diferencial do Estúdio seria vender o que
    // todo mundo já tem. No lugar entrou o nicho sob medida, que é real:
    // criar um nicho é um arquivo de configuração, não desenvolvimento.
    itens: [
      "300 posts por mês",
      "Até 10 marcas",
      "Publicar e agendar no Instagram, LinkedIn ou nos dois",
      "Nicho sob medida para cada cliente",
    ],
    destaque: false,
  },
];

export const perguntas = [
  {
    p: "Os posts saem repetidos?",
    r: "Não. Cada post do pacote trata de um assunto diferente, e o sistema compara os títulos entre si para descartar qualquer repetição antes de você receber.",
  },
  {
    p: "Preciso saber design?",
    r: "Não. As artes já saem prontas no formato do feed, com a sua assinatura. Você publica pelo painel ou baixa as imagens — sem abrir o Canva.",
  },
  {
    p: "Publico no Instagram, no LinkedIn ou nos dois?",
    r: "Você escolhe antes de gerar o pacote. No painel conecta cada rede uma vez e publica ou agenda — Instagram, LinkedIn ou os dois. Sem baixar arquivo se não quiser.",
  },
  {
    p: "Preciso de cartão para começar?",
    r: "Não. A conta nasce no plano de teste, sem cartão. Você gera um primeiro pacote, sente o ciclo e só assina se quiser o mês inteiro.",
  },
  {
    p: "O conteúdo é meu?",
    r: "É. Os textos e as artes geradas são seus, para usar como quiser, inclusive comercialmente. As fotos vêm de um banco com licença livre para uso comercial.",
  },
  {
    p: "E se um post não ficar bom?",
    r: "Você descarta. O pacote é um mês de opções, não uma obrigação — a ideia é você nunca começar de uma tela em branco, não publicar tudo cegamente.",
  },
  {
    p: "Meu ramo não está na lista.",
    r: "Escreva para comercial@amconsultoria.tech. Incluir um ramo novo é configuração de tom, público e temas — não é um projeto de desenvolvimento.",
  },
];
