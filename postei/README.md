# Postei — M1 + M2

Núcleo de geração da esteira de conteúdo. Entra **nicho + marca + quantidade**, sai um
**pacote de posts prontos**: imagem PNG (1080×1350), legenda, hashtags e CTA.

> Escopo desta entrega: **M1 (núcleo)** e **M2 (biblioteca de nichos)** do `PLANO.md`.
> Não inclui e-book (M3), publicação (M4), link/venda (M5) nem painel/cobrança (M6).

## Onde roda

| | |
|---|---|
| Servidor | VPS pessoal `217.196.61.190` — **nada da NetTurbo** |
| Caminho | `/opt/postei` |
| Processo | `pm2 postei` (porta `4710`, só em `127.0.0.1`) |
| Saída dos lotes | `/opt/postei/saida/<nicho>_<marca>_<timestamp>/` |

## Uso

```bash
# CLI (teste rápido)
node src/cli.js receitas "Cozinha da Bel" 5

# API
curl -X POST http://127.0.0.1:4710/gerar \
  -H "Content-Type: application/json" \
  -d '{"nicho":"receitas","marca":"Cozinha da Bel","quantidade":10,"assinanteId":"assinante-001"}'

curl http://127.0.0.1:4710/nichos   # lista os nichos disponíveis
curl http://127.0.0.1:4710/saude
```

`assinanteId` é **obrigatório**: é ele que ancora o teto de gasto no LiteLLM.
Sem ele o budget por plano deixa de existir, então a rota falha de propósito.

## Adicionar um nicho

Solte um `.json` em `nichos/`. **Não precisa de deploy nem de código** — nicho é conteúdo.
Campos obrigatórios: `id`, `nome`, `publico`, `tomDeVoz`, `temas`, `paleta{fundo,texto,destaque}`.
Opcionais: `observacoes` (vai para o prompt — use para travas regulatórias), `produtoFim`,
`interno` (só Alan e Junior vêem no painel), `semFoto` (não busca Pexels) e
`hashtags` (`nicho` + `comunidade`) — banco de alcance, o modelo não escolhe
isso sozinho.
O nicho `postei-marca` é o feed da própria Postei: maioria `anuncioIa`
(xAI Imagine, `grok-imagine-image`), com `anuncioProduto` / `anuncioCta` no
meio e como fallback se a chave faltar ou a chamada falhar. Cliente pagante
continua só no template.

## Decisões técnicas que valem saber

**Criativo por template programático (Rota A) — R$ 0,00/imagem.** É o que faz o plano
Essencial fechar a conta. IA de imagem custaria ~R$ 13/assinante/mês a 60 posts, e por
isso fica como cota fechada do Profissional pra cima. A chave Gemini já dá acesso ao
`postei-imagem` (`gemini-2.5-flash-image`) quando for a hora.

**Foto de fundo via Pexels, não Creative Commons.** A licença do Pexels permite uso
comercial, permite **modificar** (é o que fazemos ao escrever por cima) e não exige
atribuição. Acervo CC foi descartado: o Openverse devolve itens `by-nd`, que **proíbem obra
derivada** — escrever sobre a foto violaria a licença justamente no material que leva o @ do
assinante. Exige `PEXELS_API_KEY` (gratuita em pexels.com/api/new/); a API responde 401 sem ela.

**IA de imagem exige billing.** O `gemini-2.5-flash-image` tem cota **zero** no free tier
(`limit: 0`) — não é "acabou", nunca esteve disponível. Custa ~R$ 0,21/imagem, o que derruba
a margem do Essencial de 94% para 79%. Por isso a foto de banco é o padrão e a IA de imagem
fica como cota fechada do Profissional pra cima.

**Sem valor nutricional numérico.** O prompt proíbe caloria, grama e macro: o modelo chutaria
o número, e o erro apareceria com o @ do assinante na arte. O conteúdo fala de **composição e
função** ("fonte de proteína", "rico em fibra"). Se um dia for preciso número de verdade, a
fonte é a tabela **TACO** (UNICAMP), nunca o modelo.

**satori + resvg, não librsvg/canvas.** A VPS **não tem fontconfig** (`fc-list` ausente,
zero fontes registradas). Qualquer rota que dependa de fonte do sistema renderiza texto
invisível. O satori recebe o `.ttf` direto e converte texto em vetor.

**Geração em blocos de 5.** Acima disso o modelo estoura o limite de saída e devolve
JSON truncado no meio do lote.

**Deduplicação por código.** O modelo repete título entre blocos mesmo recebendo a lista
do que já gerou. `chaveTitulo()` compara ignorando acento, pontuação e ordem das palavras.
Post repetido num pacote de 90/mês é o que faz o assinante cancelar.

**Corte de quantidade por código.** O modelo entrega mais do que o pedido. Como o plano é
vendido por volume, entregar a mais é furo de cota.

## Limitação conhecida

**A lista `temas` do nicho é o teto da variedade.** Com 8 temas, 15 posts já geram
sobreposição temática (títulos distintos, assunto parecido). Para o plano Profissional
(90 posts/mês) cada nicho precisa de ~30 temas ou de uma estratégia de rotação.
Isso é ajuste de conteúdo, não de código.

## Pendências antes de virar produto

- **F0 do PLANO não foi fechada**: sociedade por escrito com o Junior, canal de aquisição
  dos primeiros 20 assinantes, confirmação dos 2 nichos iniciais, preços, trial, domínio.
- Os 2 nichos aqui (`receitas`, `financas-pessoais`) são **placeholders** — a escolha real
  é decisão de negócio.
- `postei-pro` (gemini-2.5-pro) bate rate limit no free tier; reservado para o M3.
