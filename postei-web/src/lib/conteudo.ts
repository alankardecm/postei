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
 * Nichos exibidos na landing (hero + seção Nichos).
 *
 * ⚠️ Precisa acompanhar os JSON em `postei/nichos/` — o motor lista o que
 * existe no disco; a capa só mostra o que está AQUI. Se adicionar nicho no
 * motor e esquecer este arquivo, a landing fica desatualizada (já aconteceu).
 *
 * Nomes curtos de propósito: na faixa "Já disponível para" cabem vários chips.
 * O nome longo do JSON do motor vale no painel de geração.
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
  {
    id: "fe-crista",
    nome: "Fé cristã",
    publico: "Criadores de conteúdo de fé, sem jargão de púlpito",
    cor: "#E0B15C",
    fundo: "#161B33",
  },
  {
    id: "espiritualidade-bem-estar",
    nome: "Espiritualidade e bem-estar",
    publico: "Terapeutas e práticas de calma, sem misticismo vago",
    cor: "#D98E63",
    fundo: "#2C2622",
  },
  {
    id: "ia-para-empresas",
    nome: "IA para empresas",
    publico: "Consultoria de IA para PMEs, sem hype",
    cor: "#9FE870",
    fundo: "#101010",
  },
];

export const passos = [
  {
    titulo: "Você diz o seu ramo",
    texto:
      "Escolhe o nicho e o nome do seu perfil. Só isso. Nada de briefing, planilha ou reunião de alinhamento.",
  },
  {
    titulo: "O Postei monta o mês",
    texto:
      "Em poucos minutos ele escreve os textos, escolhe as fotos e monta as artes — todas com a sua assinatura.",
  },
  {
    titulo: "Você revisa e publica",
    texto:
      "Recebe as imagens e as legendas prontas para copiar e colar. Você aprova o que gostou e descarta o resto.",
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
      "Artes com foto e tipográficas",
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
      "Agendamento do mês inteiro",
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
    r: "Não. As artes já saem prontas no formato do feed, com a sua assinatura. Você recebe as imagens e o texto de cada uma para colar direto no Instagram.",
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
    r: "Fale com a gente. Adicionar um nicho novo não exige desenvolvimento: é uma configuração de tom de voz, público e temas.",
  },
];
