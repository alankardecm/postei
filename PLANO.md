# Esteira de Conteúdo com IA — o que montar, como montar e quanto custa

> ⚠️ **Este arquivo é o rascunho técnico interno.** O documento oficial e mais atual — com o posicionamento em venda de POSTS (não e-books), a régua de preços por volume e o funil desenhado — é `business-plan.html` / o PDF na mesma pasta. Em caso de divergência de preço ou posicionamento, **vale o business plan**.

---

> Documento de decisão. Base: os 2 áudios do Junior de 04/08/2026, que descrevem uma ferramenta concorrente já ativa no mercado, criada por um produtor com grande audiência no Instagram.
>
> **⚠️ O plano NÃO é revender essa ferramenta.** Ela é apenas a **referência de funcionalidade** — a prova de que existe mercado e a descrição do que o produto precisa fazer. Vamos **construir nosso próprio app**, do zero, na nossa infra, e vendê-lo como **plano com assinatura recorrente**. Produto nosso, código nosso, cliente nosso.
>
> **Regra de escopo:** 100% na **VPS pessoal (Hostinger, 217.196.61.190)**. Nada dentro da rede NetTurbo, nada usando chave, servidor, número de WhatsApp ou repositório da empresa.
>
> Data: 04/08/2026 · Status: **rascunho para decisão** (nada construído ainda)

---

## 1. O que o app precisa fazer (destilado dos áudios)

O escopo funcional descrito pelo Junior. É isto que vamos construir — um SaaS que entrega, por nicho, uma **esteira completa de marketing de infoproduto**:

| Etapa | O que a IA faz |
|---|---|
| 1. Nicho | Usuário escolhe: receitas, ansiedade, casamento, finanças… |
| 2. Criativo | Gera a **imagem** do post |
| 3. Legenda | Gera a legenda + hashtags |
| 4. Link | Gera link de compra rastreável |
| 5. Captação | Recebe o lead que clicou |
| 6. Venda | Vende o infoproduto (e-book/caderno) — que **a própria IA também escreveu** |

**Referência de preço da concorrente:** entrada + R$ 34,90/mês por usuário.

**Por que só temos a descrição:** o funil dela é um VSL fechado, sem replay e sem link compartilhável (2º áudio). Não há material de primeira mão. Isso não atrapalha — **não vamos copiar tela, vamos construir a função.** A lista acima já é especificação suficiente.

---

## 2. Nosso modelo: SaaS por assinatura

**Receita = 100% assinatura recorrente do nosso app.** Sem taxa de entrada obrigatória, sem comissão sobre venda de revendedor, sem níveis. O cliente paga um plano mensal para usar a ferramenta; se ele parar de usar, ele cancela. Simples de cobrar, simples de explicar, simples de defender.

### 2.1 Planos sugeridos

| Plano | Preço/mês | O que entrega |
|---|---|---|
| **Starter** | R$ 29,90 | 1 nicho · 30 posts/mês · criativo template · e-book do nicho |
| **Pro** ⭐ | R$ 59,90 | 3 nichos · 100 posts/mês · criativo premium (IA de imagem) limitado · link de venda + captação de lead · agendamento |
| **Elite** | R$ 129,90 | Nichos ilimitados · posts ilimitados (fair use) · e-book personalizado · publicação automática · suporte prioritário |

**Por que não um preço único de R$ 34,90:** preço único force você a atender o cliente mais barato com o custo do mais caro. Com três faixas, o Starter ancora e o Pro é onde mora a margem. O Starter também funciona como isca — quem gosta sobe.

### 2.2 Decisões técnicas que decorrem do modelo
- **Acesso pela nossa API, nunca por conta compartilhada.** O áudio descreve essa ferramenta entregando "login e senha de uma conta do ChatGPT" — isso viola os termos de uso da OpenAI e não escala. Nosso app fala com os modelos pela API, atrás do LiteLLM, com **budget por assinante**. O cliente nunca vê chave nenhuma.
- **Limite por plano é código, não confiança.** O LiteLLM já faz teto de gasto por usuário — é o que impede um cliente de R$ 29,90 queimar R$ 200 de token.

### 2.3 Posicionamento (afeta o gateway de pagamento)
Vender como **ferramenta de produtividade de conteúdo** — *"seu conteúdo do mês pronto em 10 minutos"* — e não como promessa de renda (*"ganhe R$ X vendendo e-books"*). Promessa de renda dispara chargeback, denúncia e bloqueio em gateway. Além disso o valor real que entregamos **é a esteira**, não o e-book: o e-book em nicho saturado (receitas, ansiedade) tem conversão baixa e vida curta; a esteira que produz conteúdo todo dia, não.

---

## 3. O que você JÁ TEM (inventário real da VPS, coletado em 04/08/2026)

Isso é o que muda o cálculo: **quase toda a infraestrutura já está de pé e paga.**

### 3.1 Máquina
| Item | Valor |
|---|---|
| Host | Hostinger, `217.196.61.190` (`srv1121163.hstgr.cloud`) |
| CPU / RAM | **2 vCPU / 7,8 GB** |
| Disco | 96 GB — **68 GB usados, 29 GB livres (71%)** |
| RAM em uso | **3,9 GB usados + 2,5 GB de swap de 4 GB** ⚠️ |

⚠️ **Gargalo nº 1 do projeto.** A VPS já está apertada — o swap está em 62%. Qualquer serviço novo pesado derruba algo que já está no ar (aconteceu igual na VM do Hub). Ver §7.

### 3.2 Serviços que já rodam (reaproveitáveis)

| O que | Onde | Serve para quê nesta esteira |
|---|---|---|
| **Evolution API v2.3.7** | Docker `evolution_api` :8084 + Postgres :5436 | Canal WhatsApp: onboarding, entrega do link, suporte, notificação de venda |
| **Supabase self-hosted completo** | Kong :8000, Postgres, Auth (GoTrue), Storage, Realtime, Studio | **Banco + login dos assinantes + storage dos criativos**, de graça |
| **LiteLLM** | `hub-litellm` :4000 (local) | Gateway único de IA com **budget por usuário** — peça-chave pra não estourar custo |
| **Langfuse** | `hub-langfuse` :3001 (local) | Observabilidade: quanto cada assinante custou em tokens |
| **n8n + Traefik** | :5678, Traefik em :80/:443 com **Let's Encrypt já funcionando** | Agendamento das publicações + **HTTPS pronto**, sem montar nginx |
| **Gateway próprio** | `hub-gateway` :8001 | Cascata de modelos já escrita |
| **SearXNG / ChromaDB / ntfy** | :8085 / :8100 / :8091 | Pesquisa de tendências, RAG por nicho, push de alertas |
| PM2 | `radar-vendas`, `copiloto-lp`, `crm-limpanome`, `hub-client`, `beit-global` | Padrão de deploy que você já opera |

### 3.3 Código seu que já resolve pedaços do problema

| Projeto | O que aproveita |
|---|---|
| **copiloto-lp** (`/opt/copiloto-lp`) | Bot WhatsApp multi-tenant, sessões, cascata de LLM, buffer de mídia, SQLite. **É o esqueleto do produto** — provavelmente 60% do backend. |
| **radar-vendas** (`/opt/radar-vendas`) | Pipeline determinístico Gemini + scraping + JSON estruturado |
| **crm-limpanome** | Captação de lead via WhatsApp e persistência |
| **hub-client** | Multi-tenant/whitelabel — molde do painel do assinante |

### 3.4 Contas e chaves já ativas
Gemini (free tier), Groq, OpenRouter, OpenAI, Tavily, gateway Nylla, número WhatsApp `5519971599129` (hoje compartilhado limpanome + copiloto-lp).

> **Tradução:** você não precisa montar infra. Precisa montar **produto** em cima de infra que já existe. Isso é a diferença entre 3 meses e 3 semanas.

---

## 4. O que montar — arquitetura proposta

```
Assinante (WhatsApp ou painel web)
        │
        ▼
┌───────────────────────────────────────────────┐
│  APP "ESTEIRA"  (Node/Express, PM2, :47xx)     │
│  reaproveita o esqueleto do copiloto-lp        │
└───────────────────────────────────────────────┘
   │        │          │           │          │
   ▼        ▼          ▼           ▼          ▼
 NICHO   CRIATIVO   LEGENDA    PUBLICAÇÃO   VENDA
   │        │          │           │          │
   │   img (ver §5) LiteLLM     n8n cron   link + webhook
   │                 :4000      + Graph API   do gateway
   ▼
 Supabase (assinantes, posts, leads, métricas)
 Storage (imagens)  ·  Langfuse (custo por assinante)
```

### Módulos, em ordem de construção

**M1 — Núcleo de geração (a fundação)**
Recebe nicho → devolve **pacote de post**: imagem + legenda + hashtags + CTA. Tudo via LiteLLM, tudo logado no Langfuse com o `user_id` do assinante. Sem isso nada mais importa.

**M2 — Biblioteca de nichos**
Cada nicho = um arquivo de configuração (tom de voz, temas, formato do criativo, produto-fim, público). Começar com **2 nichos**, não 10. Nicho é conteúdo, não código — dá pra adicionar sem deploy.

**M3 — Infoproduto**
Gera o e-book (10–40 páginas) em Markdown → PDF, com capa. Uma geração por nicho, reaproveitada por todos os assinantes daquele nicho. **Custo único, não recorrente** — detalhe que muda a margem inteira.

**M4 — Publicação**
Aqui mora a segunda dificuldade real (§7.2). Duas rotas:
- **Rota A (recomendada no MVP):** o app gera e **entrega pronto** — o assinante posta com 1 toque. Zero fricção de API, zero risco de bloqueio.
- **Rota B (v2):** publicação automática via Instagram Graph API — exige conta **Business**, vinculada a uma Página Facebook, e revisão do app pela Meta.

**M5 — Link, lead e venda**
Link curto próprio (`/l/:id`) → registra clique → página de venda → checkout. Webhook do gateway de pagamento marca a venda e notifica o assinante no WhatsApp.

**M6 — Painel e cobrança**
Login (Supabase Auth), histórico de posts, métricas, status da assinatura. Cobrança recorrente via gateway.

---

## 5. A decisão que define o custo: como gerar o criativo

Este é o item que faz o R$ 34,90 fechar ou não fechar a conta.

| Rota | Como | Custo/imagem | Qualidade | Veredito |
|---|---|---|---|---|
| **A. Template programático** | Fundo/foto de banco livre + tipografia via `canvas`/Satori. IA escreve **só o texto** | **R$ 0,00** | Boa e consistente. É o que 90% das ferramentas de "post pronto" realmente fazem | ⭐ **MVP** |
| **B. IA de imagem por API** | Gemini image / equivalente | ~R$ 0,20–0,25 (**conferir preço vigente**) | Alta, "wow" | v2, como recurso premium |
| **C. Modelo local** | Stable Diffusion na VPS | R$ 0 marginal | Boa | ❌ **Inviável** — 2 vCPU sem GPU. Descartado |

**Impacto direto:** a 60 posts/mês por assinante, a Rota B custa **~R$ 13/mês por assinante**; a Rota A custa **R$ 0**. Por isso o Starter (R$ 29,90) usa só template, e o criativo por IA entra no **Pro como cota limitada** — é exatamente ali que o plano de cima se justifica.

---

## 6. Custos

### 6.1 Para montar (setup)

| Item | Custo |
|---|---|
| VPS | **R$ 0** — já paga e já rodando |
| Infra (Supabase, LiteLLM, Evolution, n8n, HTTPS) | **R$ 0** — já instalada |
| Domínio próprio `.com.br` | **~R$ 40/ano** (hoje você usa o hostname da Hostinger) |
| Upgrade de RAM da VPS (ver §7.1) | **~R$ 35–60/mês** — provável, não certo |
| Chip/número WhatsApp dedicado | ~R$ 20/mês (recomendado: não misturar com limpanome/copiloto) |
| Desenvolvimento | **Seu tempo.** ~3–4 fins de semana até o MVP, reaproveitando o copiloto-lp |
| **Total de caixa pra começar** | **≈ R$ 100** + eventual upgrade |

### 6.2 Custo recorrente **por assinante** (60 posts/mês)

| Item | Rota A (template) | Rota B (IA de imagem) |
|---|---|---|
| Texto (legenda/hashtag) via Groq/Gemini free-tier | ~R$ 0,10 | ~R$ 0,10 |
| Imagem | **R$ 0,00** | ~R$ 13,00 |
| Infra rateada (até ~100 assinantes) | ~R$ 1,00 | ~R$ 1,00 |
| Gateway de pagamento (~5% + fixo) | ~R$ 2,20 | ~R$ 2,20 |
| **Custo total** | **≈ R$ 3,30** | **≈ R$ 16,30** |
| Margem no **Starter** (R$ 29,90) | **≈ R$ 26,60 (89%)** | — (Starter não usa IA de imagem) |
| Margem no **Pro** (R$ 59,90) | ≈ R$ 56,60 (95%) | **≈ R$ 43,60 (73%)** |

> Preços de IA mudam com frequência — **validar os valores vigentes antes de fechar o preço de venda.** Os números acima são ordem de grandeza para decisão, não cotação.

### 6.3 Cenários (mix conservador: 60% Starter, 35% Pro, 5% Elite → ticket médio ~R$ 45)

| Assinantes | Receita/mês | Custo | **Lucro/mês** |
|---|---|---|---|
| 10 | R$ 450 | ~R$ 110 | **~R$ 340** |
| 50 | R$ 2.250 | ~R$ 350 | **~R$ 1.900** |
| 100 | R$ 4.500 | ~R$ 650 | **~R$ 3.850** |
| 300 | R$ 13.500 | ~R$ 2.100 (já exige VPS maior) | **~R$ 11.400** |

**Ponto de equilíbrio: ~3 assinantes.** O risco financeiro deste projeto é baixíssimo — o risco real é **tempo** e **canal de aquisição** (§7.3).

### 6.4 Gateway de pagamento (recorrência)

| Opção | Taxa aprox. | Nota |
|---|---|---|
| **Asaas / Mercado Pago** | ~4,99% + fixo | Recorrência nativa, Pix, PJ brasileira |
| **Stripe** | ~3,99% + R$ 0,39 | Melhor API, assinatura nativa |
| **Kiwify / Hotmart** | ~9,9% | Caro, mas traz checkout + afiliados prontos |

Recomendação: **Asaas ou Stripe**. Hotmart/Kiwify só se você quiser o programa de afiliados deles pronto — e aí a taxa alta é o preço de não construir isso.

---

## 7. Riscos e gargalos (o que realmente pode travar)

### 7.1 🔴 RAM da VPS — gargalo imediato
7,8 GB com **3,9 GB usados e 2,5 GB de swap ocupado**, rodando Supabase inteiro + n8n + Evolution + 6 apps PM2. Um serviço novo pode derrubar o `crm-limpanome` ou o `copiloto-lp`, que estão em uso.
**Mitigação:** antes de subir qualquer coisa, auditar o que dá pra desligar (o `odysseus` e o `chromadb` valem revisão — 6 semanas no ar, uso?). Se não der, upgrade de plano.

### 7.2 🟡 Publicação automática no Instagram
A Graph API só publica em conta **Business**, exige App revisado pela Meta e tem limite de posts/dia. Automação por navegador (Puppeteer) **derruba conta** e não é opção. Por isso a Rota A do M4 ("gera pronto, você posta") é a escolha certa pro MVP — e, honestamente, é o que a maioria dessas ferramentas entrega de verdade.

### 7.3 🔴 Aquisição — o risco de verdade
Montar isso é fácil pra você. **Vender é o problema.** A concorrente funciona porque o dono tem centenas de milhares de seguidores — o produto pode até ser bom, mas o ativo real é a audiência. Nós não temos audiência. Sem uma resposta clara para *"de onde vêm os primeiros 20 assinantes?"*, o projeto vira mais um app rodando no PM2.
**Isso precisa ser respondido antes do código, não depois.** Nota irônica e útil: o próprio app resolve isso pra nós — o nicho zero é o nosso, e a esteira gera o conteúdo que divulga a esteira. Isso é também a melhor prova social possível.

### 7.4 🟡 Churn — o risco específico de assinatura
Ferramenta de conteúdo tem churn alto: o cliente assina animado, posta duas semanas, some. Como receita é 100% recorrente, **retenção é o número que importa mais que aquisição**. Duas defesas baratas: (a) entregar o pacote de posts **empurrado** no WhatsApp toda segunda, sem o cliente precisar lembrar de entrar; (b) mostrar no painel o que ele já produziu (efeito acervo — quanto mais ele tem lá, mais caro sair). Medir churn desde o primeiro cliente.

### 7.5 🟡 Conflito com a NetTurbo
Produto pessoal, na VPS pessoal, com chaves pessoais, fora do horário. Manter essa separação **absoluta** — inclusive não reusar a chave Tavily/Groq que está no `.env` do Hub. Chaves novas, conta nova.

### 7.6 🟡 Promessa de renda
Se o marketing prometer faturamento ("ganhe R$ X/mês"), aumenta muito o risco de chargeback, denúncia e bloqueio no gateway. Posicionar como **ferramenta de produtividade de conteúdo**, com prova de entrega — não como promessa de renda.

---

## 8. Plano sugerido

| Fase | Entrega | Esforço |
|---|---|---|
| **F0 — Validação** | Responder §7.3 (canal de aquisição) e escolher 2 nichos. **Sem código.** | 1 conversa |
| **F1 — Núcleo** | M1 + M2: nicho → pacote de post (imagem template + legenda), entregue no WhatsApp | 1 fim de semana |
| **F2 — Produto** | M3 (e-book) + M5 (link, lead, venda) + página de venda | 1 fim de semana |
| **F3 — Cobrança** | M6: Supabase Auth, painel, **assinatura recorrente no gateway** (3 planos, upgrade/downgrade, cancelamento) | 1 fim de semana |
| **F4 — Piloto** | 5 usuários reais, 30 dias grátis → converter em assinatura paga. Medir: posts publicados, **taxa de conversão do trial**, **churn no 2º mês** | 30–60 dias |
| **F5 — Escala** | Só depois do piloto: publicação automática (Graph API), criativo premium por IA, mais nichos | — |

**Nada de F5 antes de F4.** O piloto é que diz se o produto tem valor ou se é só uma esteira bonita.

---

## 9. Decisões pendentes (para você e o Junior fecharem)

1. **Sociedade:** o Junior entra como quê — sócio (qual %?), responsável comercial, ou trouxe a ideia e fica com comissão de indicação? **Definir antes de codar**, por escrito. É a decisão que mais azeda projeto de dois amigos depois que dá certo.
2. **Aquisição:** de onde vêm os primeiros 20 assinantes? (§7.3)
3. **Nichos iniciais:** quais 2?
4. **Preço:** confirmar a régua R$ 29,90 / R$ 59,90 / R$ 129,90, ou entrar com preço único mais baixo pra ganhar volume no início?
5. **Trial:** 7 ou 30 dias grátis? Pede cartão na entrada ou não? (Com cartão converte muito mais; sem cartão traz mais gente e mais curioso.)
6. **Criativo:** confirmar Rota A (template) no MVP, IA de imagem só no Pro.
7. **Nome e domínio** do produto.

---

## Anexo — Transcrição dos áudios (04/08/2026)

Transcrito via Whisper. Resumo fiel, não literal.

**Áudio 1 (10:03) —** VSL longo de uma IA vendida por nicho, entregue via "login e senha de conta do ChatGPT". Ela gera criativo, legenda e link, capta o lead e vende o infoproduto (e-book/caderno de 50 receitas) que ela mesma escreve. Cobrança dela: entrada + R$ 34,90/mês, com percentual sobre as vendas de cada revendedor.

*(Este anexo registra o que a concorrente faz. Nosso plano é outro: app próprio, assinatura pura — §2.)*

**Áudio 2 (10:16) —** Produto = uma ferramenta cujo nome remete a "viralizar", de um produtor com ~800 mil seguidores no Instagram. Funil fechado: vídeo sem replay, sem link compartilhável — não consegue repassar o material, só descrever por escrito. Avaliação dele: *"vi nisso um mercado legal; se impulsionar, vai ser um infoproduto tranquilo."*
