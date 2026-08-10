# Postei — documentação

Produto da **AM Consultoria** (Alan Kardec Moreira, CNPJ 43.947.919/0001-08).
Gera pacotes de conteúdo para redes sociais a partir de um ramo e um nome de perfil:
imagem, legenda, hashtags e chamada. O assinante revisa e publica — ou publica direto
do painel, no Instagram conectado.

> **Não há sociedade.** A parte comercial é comissionada sobre venda.

---

> ⚠️ **O piloto ainda não validou o produto.** A primeira usuária revisou os 30 posts,
> deu retorno detalhado e **não publicou nenhum**. Tudo o que está descrito abaixo funciona
> tecnicamente; nada disso prova que alguém quer o produto.

## Sumário

1. [Como está montado](#como-está-montado)
2. [Endereços e caminhos](#endereços-e-caminhos)
3. [O motor](#o-motor)
4. [A plataforma](#a-plataforma)
5. [Instagram](#instagram)
6. [Deploy](#deploy)
7. [Decisões que valem entender](#decisões-que-valem-entender)
8. [Armadilhas conhecidas](#armadilhas-conhecidas)
9. [O que falta](#o-que-falta)

---

## Como está montado

Duas peças, no mesmo servidor:

```
  navegador
      │  HTTPS
      ▼
  Traefik ──► postei-web (Next.js, :4720)   ── painel, landing, login
                   │
                   │ chave compartilhada, só localhost
                   ▼
              postei (Express, :4710)        ── gera o conteúdo
                   │
      ┌────────────┼─────────────┐
      ▼            ▼             ▼
  LiteLLM      Pexels       disco (saida/)
  (Gemini)     (fotos)
```

Também no servidor: **Supabase self-hosted** (login, links de captação, conexão
com o Instagram) e o **Traefik** que já existia para o n8n.

O motor não conhece usuário. Quem autentica é o painel, contra o Supabase; o motor
só confere a chave compartilhada e confia no `assinanteId` que recebe.

---

## Endereços e caminhos

| | |
|---|---|
| Painel e landing | https://postei.srv1121163.hstgr.cloud |
| Supabase | https://api.postei.srv1121163.hstgr.cloud |
| Repositório | `github.com/alankardecm/postei` (privado) |

**Na máquina do Alan** — `Documents\00 - 2026\35.1 PROJETOS PARTICULARES\ESTEIRA-IA-CONTEUDO\`

| Pasta | |
|---|---|
| `postei/` | motor |
| `postei-web/` | plataforma |
| `postei/validacao/` | galerias HTML para conferir lotes |
| `postei/entregas/` | zips prontos para mandar ao assinante |
| `deploy.sh` | publica no servidor |

**No servidor** — `217.196.61.190`

| Caminho | |
|---|---|
| `/opt/postei` | motor · `pm2 postei` · porta 4710, só localhost |
| `/opt/postei-web` | plataforma · `pm2 postei-web` · porta 4720 |
| `/opt/postei/saida/<assinante>/<lote>/` | pacotes gerados |
| `/docker/n8n/dinamico/postei.yml` | rotas HTTPS no Traefik |
| `/var/www/supabase/docker` | Supabase |

Segredos ficam em `/opt/postei/.env` e `/opt/postei-web/.env.production`, ambos `600`,
nenhum versionado. Para gravar um novo, **do PowerShell**:

```bash
ssh -t root@217.196.61.190 /opt/postei-web/definir-segredo.sh NOME_DA_VARIAVEL
```

---

## O motor

`/opt/postei` — Node + Express, sem framework.

### Como um pacote nasce

1. Sorteia os temas do nicho (um por post).
2. Pede ao modelo, **em blocos de 5**, um JSON com título, legenda, hashtags, chamada
   e a busca da foto.
3. Descarta repetição comparando títulos.
4. Busca a foto no Pexels e monta a arte com `satori` + `resvg`.
5. Grava tudo em `saida/<assinante>/<lote>/` com um `pacote.json`.

### Nichos

Um arquivo JSON por ramo, em `nichos/`. **Adicionar nicho não exige deploy nem código.**

```json
{
  "id": "meu-nicho",
  "nome": "Nome que aparece",
  "publico": "quem é o seguidor",
  "tomDeVoz": "como falar",
  "temas": ["...", "..."],
  "paleta": { "fundo": "#101010", "texto": "#F5F5F5", "destaque": "#9FE870" },
  "observacoes": "travas — vai direto para o prompt"
}
```

O campo `observacoes` é onde entram as regras que não podem ser quebradas. No nicho de
nutrição, as do conselho profissional; no de IA, a proibição de inventar caso de cliente.

📌 **A lista `temas` é o teto da variedade.** Para 90 posts/mês cada nicho precisa de
~30 temas, senão os assuntos se repetem.

### Rotas

Todas exigem `x-postei-chave` e `x-postei-assinante`.

| | |
|---|---|
| `GET /nichos` | lista os ramos disponíveis |
| `POST /tarefas` | enfileira uma geração, devolve id na hora |
| `GET /tarefas/:id` | andamento |
| `GET /lotes` · `GET /lotes/:id` | pacotes do assinante |
| `GET /lotes/:id/imagem/:arquivo` | a arte |
| `DELETE /assinante` | apaga tudo do assinante |

### Scripts

```bash
node src/cli.js <nicho> "<marca>" <quantidade>      # gerar sem servidor
python3 scripts/montar-galeria.py <lote>            # folha de aprovação em HTML
python3 scripts/empacotar-entrega.py <lote>         # imagens + LEGENDAS.txt
python3 scripts/converter-para-jpeg.py saida        # PNG antigo → JPEG
node scripts/gerar-demo-landing.mjs                 # criativos da landing
```

---

## A plataforma

`/opt/postei-web` — Next.js 16, React 19, Tailwind 4, TypeScript.
Componentes animados do **React Bits** (MIT + Commons Clause).

| Rota | |
|---|---|
| `/` | landing |
| `/entrar` · `/criar-conta` | acesso (Supabase) |
| `/painel` | gerar, histórico, Instagram, captação |
| `/painel/lote/[id]` | os posts do pacote: editar texto, publicar agora ou agendar |
| `/l/[codigo]` | página pública do link de captação |
| `/esqueci-senha` · `/nova-senha` | recuperação de senha |
| `/privacidade` · `/termos` · `/exclusao-de-dados` | documentos legais |

### Regra de ouro da segurança

**O `assinanteId` sai sempre de `supabase.auth.getUser()` no servidor, nunca do corpo
da requisição.** Se viesse do cliente, bastaria trocar o valor no navegador para ler o
pacote de outra pessoa.

No `proxy.ts` a validação usa `getUser()` e **nunca `getSession()`** — o segundo só lê
o cookie e aceitaria um token forjado.

---

## Instagram

Publicação direta, usando **Instagram API with Instagram Login**.

**App Review não é necessário** para publicar em contas que você possui ou administra:
o Standard Access basta. Review só para atender contas de terceiros — e aí exige
portfólio empresarial verificado, que a AM Consultoria já tem.

### Configuração na Meta

| | |
|---|---|
| App da Meta | `1020466784319299` |
| App do Instagram | `1061113693070928` ← é este no OAuth |
| Portfólio | AM Gestão De Tráfego E-Commerce (verificado) |
| Escopos | `instagram_business_basic`, `instagram_business_content_publish` |

Endereços cadastrados no passo 4 da tela do Instagram:

```
https://postei.srv1121163.hstgr.cloud/api/instagram/retorno
https://postei.srv1121163.hstgr.cloud/api/instagram/desconectar
https://postei.srv1121163.hstgr.cloud/exclusao-de-dados
```

### Como a publicação funciona

A Meta **não recebe o arquivo** — recebe uma URL e baixa. Como as imagens ficam atrás
de login, cada post ganha uma **URL assinada** (`lib/imagem-publica.ts`): HMAC do
conjunto assinante + lote + arquivo + prazo, válida 15 minutos.

Depois é o fluxo de dois passos da Meta: cria o container, espera o processamento
terminar, publica. **Carrossel são três passos**: cada imagem vira container filho,
um container agrupa os filhos, e só então publica.

### Rotinas automáticas

| Quando | O quê |
|---|---|
| a cada 5 min | `/api/cron/publicar` — publica o que venceu na fila |
| a cada 10 min | `reconciliar-pendentes.sh` — confere quem está esperando pagamento |
| diário 03h41 | `backup.sh` — banco, auth e pacotes; 14 dias |
| diário 04h17 | `renovar-tokens.mjs` — renova o token antes dos 60 dias |
| diário 05h07 | `reconciliar-assinaturas.sh` — confere **todas** as assinaturas |

A publicação vive em `lib/publicacao.ts` e é usada pelos **dois** caminhos: o botão do
painel e o agendador. O item é marcado `publicando` com update condicional antes de
começar — se a rotina rodar de novo durante uma publicação demorada, não pega o mesmo
item e o assinante não posta duplicado.

### Cota mensal

Cada assinante tem plano e limite (`lib/planos.ts`). A reserva acontece numa **função no
banco**, antes de enfileirar: entre "ler o consumo" e "gravar o novo" cabem duas requisições
simultâneas, e as duas passariam pelo limite. Sem cota, um usuário queima a cota do provedor
de todos os outros.

### Fila que sobrevive a reinício

A geração vive na tabela `geracoes`, não em memória. Se o processo cair no meio, o motor
**retoma na subida** — refazendo a geração inteira, porque o pacote sai em blocos e não há
ponto de retomada confiável. Teto de 3 tentativas.

### Pagamento

Assinatura mensal no Mercado Pago, modelo *preapproval* sem plano associado. O cartão
**nunca passa pelo nosso servidor** — a pessoa paga no checkout deles.

Na criação gravamos `external_reference = "{id-do-usuário}:{plano}"`. É essa referência
que permite perguntar depois, a qualquer momento, "o que houve com o pagamento deste
usuário?" — sem depender de nada que tenha chegado até nós.

**Nada que chega é levado a sério.** O aviso do gateway diz apenas *que* algo mudou; o
estado é sempre buscado na API deles. Sem isso, qualquer um poderia POSTar no nosso
endereço dizendo "assinatura autorizada" e ganhar um plano de graça.

**O plano é liberado por três caminhos**, e a regra vive num lugar só
(`lib/assinatura-sync.ts`):

| Caminho | Prazo |
|---|---|
| volta do checkout (`/painel?pagamento=voltou`) | segundos — é o caminho normal |
| webhook `/api/pagamento/webhook` | instantâneo, **mas nunca funcionou** (ver Armadilhas) |
| rotinas de 10 min e diária | fecha o resto |

O que cada estado faz com o acesso — e **nenhum deles tranca a pessoa fora do produto**:

- **autorizado** → o plano pago passa a valer;
- **pendente** → não mexe em nada. Quem clicou em "Assinar" e desistiu continua com o
  que já tinha; perder o plano gratuito por ter desistido de pagar seria absurdo;
- **cancelado/pausado** → acesso até a data já paga, depois cai para o gratuito.

### Acesso de cortesia

Alan, Juliana e Junior têm o plano **Estúdio sem cobrança**. A lista é de e-mails, em
`lib/planos.ts`, e por isso vale **antes do cadastro** — quem está nela já cria a conta com
o acesso valendo, sem ninguém precisar liberar nada.

Fica em código e não numa tela de administração de propósito: conceder plano de graça pela
interface é porta de entrada se alguém tomar uma conta.

A coluna `assinaturas.cortesia` marca essas contas, e a reconciliação **as ignora** — sem
isso a rotina diária derrubaria o plano cheio de quem nunca vai pagar, todo dia. O
`status_pagamento` continua `sem_cobranca`, que já é o estado certo (o banco tem restrição
que só aceita os estados conhecidos; inventar um valor quebra o cadastro na hora).

### Evidência científica

Nichos com `evidencia: true` buscam no PubMed **antes** de escrever: os temas viram
consulta técnica, os resumos entram no prompt, e o post nasce ancorado. Escrever
primeiro e procurar estudo depois produzia fonte real de outro assunto.

---

## Deploy

```bash
./deploy.sh          # motor + plataforma
./deploy.sh motor
./deploy.sh web
```

Envia **apenas o que o git rastreia** — `node_modules`, `.env` e pacotes gerados nunca
sobem, e os segredos do servidor não são tocados. Instala, compila, reinicia e confere
se cada serviço respondeu.

---

## Decisões que valem entender

**Criativo por template, não por IA de imagem.** Custa R$ 0,00 contra ~R$ 0,21 por
imagem. É o que faz o plano de R$ 39,90 fechar a conta — IA de imagem derrubaria a
margem de 94% para 79%.

**Foto do Pexels, não Creative Commons.** A licença do Pexels permite uso comercial,
permite modificar e não exige atribuição. O acervo CC tem itens `by-nd`, que **proíbem
obra derivada** — escrever sobre a foto violaria a licença.

**`satori` + `resvg`, não librsvg.** A VPS não tem fontconfig; qualquer rota que dependa
de fonte do sistema renderiza texto invisível. Esses dois leem o `.ttf` direto.

**Geração em segundo plano.** 30 posts levam ~3 minutos e nenhum proxy HTTP espera isso.

**Tudo em JPEG.** A API do Instagram só publica JPEG. Qualidade 95 com `4:4:4` no
tipográfico, senão aparece franja em volta das letras.

**O que o modelo ignora vira código.** Repetição entre blocos, hashtag com espaço,
quantidade acima do pedido, busca de foto com vírgula — todos foram instruídos no prompt,
todos foram desobedecidos, todos hoje são tratados em código.

---

## Armadilhas conhecidas

**Cota do Gemini.** Free tier: 20 req/min e cota diária **por modelo**. Há cascata
(`postei-texto-lite` → `postei-texto`), respeito ao `retry in Xs` que a API informa, e
desistência após 3 recusas devolvendo lote parcial. Para assinante pagante, **ativar
billing** — custa ~R$ 0,08 por assinante/mês.

**A foto nem sempre casa com o tema.** Post de introdução alimentar (bebê de 6 meses)
veio com criança de 4 anos. É limite de banco de imagem; a solução é o assinante poder
trocar a foto.

**O webhook do Mercado Pago nunca chegou.** Nas duas cobranças de teste, nenhum aviso.
O endereço responde 200 de fora, tem certificado Let's Encrypt válido e DNS v4 e v6 —
a entrega simplesmente não aconteceu, e não foi possível descobrir o motivo sem o painel
de webhooks deles. **Por isso o pagamento não depende do webhook**: as rotinas de 10 min
e diária conferem na fonte. Se um dia ele passar a chegar, é só um atalho.

**O `supabase-js` devolve o erro, não o lança.** `const { error } = await admin.from(…)`
— ignorar esse retorno faz uma falha de banco virar HTTP 200. No webhook isso significava
o gateway nunca reenviar o aviso e uma assinatura paga ficar sem ser liberada, sem erro
em lugar nenhum. Sempre checar `error`.

**`external_reference` vai para coluna `uuid`.** Ela vem de fora e pode ser qualquer
coisa; lixo ali derrubava o insert inteiro do evento — justamente o registro usado para
depurar. Validar antes.

**A senha de app do Gmail vem com espaços.** São 19 caracteres na tela e 16 de verdade.

**A `POSTEI_API_KEY` faz dois trabalhos.** Além de autenticar o painel no motor, ela é o
segredo que **assina as URLs temporárias de imagem** (`imagem-publica.ts`). Rotacionar
invalida as assinaturas em circulação — como valem 15 minutos, o risco é só uma publicação
exatamente em curso. **Vale separar em dois segredos** quando houver oportunidade.

**Nem toda rota do motor exige chave.** `/saude` e `/nichos` são públicas de propósito;
testar rotação nelas dá falso negativo. Usar `/lotes` para verificar.

**`status_pagamento` tem restrição no banco** (`sem_cobranca`, `pendente`, `ativa`,
`pausada`, `cancelada`). Gravar um valor fora dessa lista quebra o cadastro na hora.

**Dev local precisa de túnel:** `ssh -N -L 4710:127.0.0.1:4710 root@217.196.61.190`

---

## O que falta

**Curto prazo**
- Trocar a foto que não casou com o tema
- Baixar o zip do pacote pelo painel
- Reels

**O que o piloto revelou**
- A primeira usuária não publicou nenhum post. Ela apontou conteúdo vago e falta de gancho;
  as correções foram feitas mas **ela ainda não viu a versão nova**. Entregar e perguntar
  diretamente por que não postou vale mais que qualquer recurso novo.

**Antes de cobrar**
- **Domínio próprio** — resolve três coisas: o `contato@postei.com.br` publicado e
  inexistente, a entrega dos e-mails (hoje caem no spam porque o remetente é `@gmail.com`
  e o link aponta para outro domínio) e o endereço para vender
- **Trocar as credenciais do Mercado Pago para produção.** Hoje o `MP_ACCESS_TOKEN` é de
  uma **conta de teste** (sandbox) — cobrança de verdade não acontece
- Cópia de backup fora do servidor
- Revisão jurídica dos documentos
- Contrato de comissionamento da parte comercial

**Depois**
- Imagens por IA (anunciadas nos planos pagos, dependem de billing no Gemini)
- Reels
- Entrega por WhatsApp (Evolution API já está no servidor)
