# Postei / AM Consultoria — conhecimento acumulado

> **Este arquivo é a “memória” do projeto.**  
> Tudo que formos descobrindo, decidindo e operando deve ser registrado aqui (e, se for
> procedimento longo, em um doc dedicado com link neste índice).  
> Data de criação: 2026-08-11 · Última atualização: 2026-08-14

Leia também:

| Documento | Conteúdo |
|---|---|
| [`DOCUMENTACAO.md`](../DOCUMENTACAO.md) | Arquitetura, rotas, armadilhas técnicas |
| [`MIDIA-FOTO-VIDEO.md`](MIDIA-FOTO-VIDEO.md) | Upload de foto, re-render, Reels |
| [`DOMINIO-PRODUCAO.md`](DOMINIO-PRODUCAO.md) | DNS, Traefik, domínio novo, MP, Instagram (passo a passo) |
| [`PLANO.md`](../PLANO.md) | Rascunho de negócio (pode divergir do business plan) |
| `business-plan.html` / PDF | Posicionamento comercial oficial |

---

## 1. Identidade do produto

| | |
|---|---|
| **Produto** | Postei — esteira de conteúdo com IA |
| **Empresa** | AM Consultoria (Alan Kardec Moreira, CNPJ 43.947.919/0001-08) |
| **Não há sociedade** | Comercial comissionado sobre venda (Junior, etc.) |
| **Repo** | `github.com/alankardecm/postei` (privado) |
| **VPS** | Hostinger `217.196.61.190` — **nada da NetTurbo** |
| **URL oficial (2026-08-11)** | **https://postei.amconsultoria.tech** |
| **URL legada** | https://postei.srv1121163.hstgr.cloud (manter um tempo como backup) |
| **Supabase (API)** | https://api.postei.srv1121163.hstgr.cloud |

---

## 2. Decisões de negócio que valem

1. **Vender a esteira**, não “ganhe dinheiro com e-book”.  
2. **Criativo por template** (satori + Pexels) no Essencial — IA de imagem só se a margem permitir.  
3. **Landing não lista inventário de nichos** — fala em “vários ramos / muito mais”; catálogo real = motor `postei/nichos/*.json`.  
4. **Domínio da marca mãe** `amconsultoria.tech` com subdomínio do produto `postei.` — margem para outros apps.  
5. **Validação:** Alan já publicou no @alanmoreira520 e gostou; piloto Juliana ainda é ponto aberto de retenção.  
6. **MP em produção** + webhook no domínio novo (2026-08-11).  

---

## 3. Arquitetura (resumo)

```
Navegador
   │ HTTPS (Traefik)
   ▼
postei-web  Next.js :4720   → painel, landing, login, pagamento, Instagram
   │ chave POSTEI_API_KEY (localhost)
   ▼
postei      Express  :4710   → geração de pacotes
   │
   ├── LiteLLM / Gemini
   ├── Pexels
   ├── Supabase (auth, links, IG, cotas, pagamentos)
   └── disco /opt/postei/saida/
```

Traefik file provider: `/docker/n8n/dinamico/postei.yml`  
Backup local da config: `tmp/postei-traefik.yml` (pasta `tmp/` pode estar no `.gitignore`).

---

## 4. Domínio `amconsultoria.tech` (2026-08-11)

### DNS Hostinger (nameservers padrão Hostinger)

| Tipo | Nome | Conteúdo |
|---|---|---|
| A | `@` | `217.196.61.190` |
| CNAME | `www` | `amconsultoria.tech` |
| A | `postei` | `217.196.61.190` |

Propagação confirmada (Google DNS 8.8.8.8).

### Traefik

Router do painel aceita **dois** hosts:

- `postei.amconsultoria.tech`  
- `postei.srv1121163.hstgr.cloud`  

Certificado Let's Encrypt com SAN nos dois.  
Supabase API permanece no host legado `api.postei.srv1121163.hstgr.cloud`.

### Env produção (`/opt/postei-web/.env.production`)

```
NEXT_PUBLIC_SITE_URL=https://postei.amconsultoria.tech
NEXT_PUBLIC_SUPABASE_URL=https://api.postei.srv1121163.hstgr.cloud
```

`SITE_URL` manda: OAuth Instagram, `back_url` / `notification_url` de **novas** assinaturas MP, URLs públicas de mídia na publicação.

### Raiz `amconsultoria.tech`

DNS aponta para a VPS; **ainda não há site** da AM lá (só o Postei em `postei.`).

---

## 5. Mercado Pago — o que aprendemos

### Modelo

- Preapproval **sem plano associado**  
- Cartão só no checkout do MP  
- `external_reference` = `{usuarioId}:{plano}`  
- **Nunca confiar no corpo do webhook** — só no `id`; estado real = API `verAssinatura`  

### Três caminhos liberam o plano

1. Webhook `/api/pagamento/webhook`  
2. Volta do checkout `/painel?pagamento=voltou` → `sincronizarAssinatura`  
3. Rotinas (pendentes ~10 min + diária) — **salvam se o webhook falhar**  

### Webhook no painel MP (produção)

```
https://postei.amconsultoria.tech/api/pagamento/webhook
```

Evento: **Planos e assinaturas**.  
Teste simulado com `data.id = 123456` → **200 OK** (esperado; id não existe, app trata 4xx do MP como 200 para não reenviar eterno).  
`notification_url` no body do pedido **pode ser ignorado** pelo MP — a URL do **painel da aplicação** é a que manda.  
Assinatura secreta = `MP_WEBHOOK_SECRET` no servidor (não regenerar sem atualizar `.env`).

### Doc antiga vs domínio

Antes o webhook estava no host hstgr; em 2026-08-11 migrou para amconsultoria.tech com teste 200.

---

## 6. Instagram — o que aprendemos

### App

| | |
|---|---|
| Instagram App ID (OAuth `client_id`) | `1061113693070928` |
| App Meta (pai) | `1020466784319299` |
| Escopos no código | `instagram_business_basic`, `instagram_business_content_publish` |

### Onde cadastrar URLs na Meta (UI 2026)

1. Developers → app → **Instagram** → tela da API  
2. Passo **4. Configurar o login da empresa no Instagram**  
3. Botão **Configurações do login da empresa**  
4. Campos:

| Campo | Valor oficial |
|---|---|
| URIs de redirecionamento OAuth | `https://postei.amconsultoria.tech/api/instagram/retorno` (+ legado hstgr) |
| URL desautorização | `https://postei.amconsultoria.tech/api/instagram/desconectar` |
| URL exclusão de dados | `https://postei.amconsultoria.tech/exclusao-de-dados` |

O “URL incorporado” do passo 4 é só exemplo — o Postei monta o OAuth sozinho.  
Deve conter `redirect_uri=https://postei.amconsultoria.tech/api/instagram/retorno`.

### Bug e correção: “A autorização não conferiu”

- Mensagem UI = query `?ig=estado_invalido`  
- Causa: cookie `ig_estado` no host A e volta OAuth no host B (legado vs oficial), ou cookie perdido  
- **Correção (2026-08-11, commit `9c31c9a`)**:  
  - `state` **HMAC** amarrado ao `usuarioId` (`criarEstadoOAuth` / `validarEstadoOAuth` em `lib/instagram.ts`)  
  - Cookie vira reforço, não única fonte  
  - `/api/instagram/conectar` redireciona para o host do `SITE_URL` se o pedido veio de outro host  

### Conta do cliente

- Precisa ser **profissional** (Empresa ou Criador)  
- Mesmo fluxo para **todos** os assinantes (um app Meta, muitos usuários)  
- App Review: necessário em escala para contas de terceiros; Standard Access basta para contas próprias/administradas  

---

## 7. Identidade visual (tema)

Tema **escuro** + verde AM:

| Token | Hex | Uso |
|---|---|---|
| limão | `#9FE870` | CTA, acento |
| ink | `#101010` | texto sobre limão |
| papel | `#12141A` | fundo página |
| branco | `#1A1C18` | cards |
| tinta | `#F2F4EE` | texto principal |
| areia | `#E9D8A6` | chips |

Definido em `postei-web/src/app/globals.css`.  
Landing: esteira **dupla** com galeria completa; seção nichos = **3 cards** de exemplo + copy “incluímos sob medida” (sem meta “a landing não lista…”).

---

## 8. Mídia (foto + vídeo)

Ver [`MIDIA-FOTO-VIDEO.md`](MIDIA-FOTO-VIDEO.md).

- Trocar foto (Pexels) / upload → re-render satori; backup `_backup_arte_*`  
- Upload MP4 → publicar como Reel  
- Commit feature: `c859b2e`  

---

## 9. Planos (código)

`postei-web/src/lib/planos.ts`:

| Plano | Posts/mês | Preço |
|---|---|---|
| teste | 2 | grátis |
| essencial | 30 | 39,90 |
| profissional | 90 | 89,90 |
| estudio | 300 | 199,90 |

Cortesia Estúdio: e-mails em código (Alan, Juliana, Junior).
Marca própria + xAI: só Alan e Junior (`DONOS_MARCA` em `planos.ts`).

---

## 10. Marca própria (feed da Postei)

O motor gera **conteúdo de nicho** (foto + título) para o cliente. O Instagram da
Postei precisa de **anúncio de produto** (headline + mockup + CTA). São layouts
diferentes.

| | |
|---|---|
| Nicho | `postei/nichos/postei-marca.json` (`interno: true`) |
| Layouts | `anuncioIa` (xAI Imagine `grok-imagine-image`) + templates `anuncioProduto` / `anuncioCta` |
| Quem vê no painel | só Alan e Junior (`DONOS_MARCA`) |
| Perfil oficial | [@cliqueipostei.app](https://www.instagram.com/cliqueipostei.app) |
| Preview sem LLM | `node scripts/preview-anuncio.mjs` → `postei/validacao/anuncio/` |

### Ligar e gerar

1. Entrar no painel com a conta do Alan ou do Junior.
2. Ramo: **Postei — marca própria**. Nome do perfil: `Postei` (ou `@cliqueipostei.app`).
3. Gerar 10 ou 30. A maior parte sai anúncio; o resto é destaque/lista sobre o problema.
4. Em **Conectar Instagram**, autorizar `@cliqueipostei.app` (conta profissional).
5. Publicar ou agendar no próprio painel.

A maior parte do lote sai em `anuncioIa` (Imagine da xAI). Sem `XAI_API_KEY` ou se
a chamada falhar, cai no template `anuncioProduto` e o lote segue.
Custo: US$ 0,02/imagem × 30 ≈ US$ 0,60/mês da marca. Texto do cliente continua no
LiteLLM/Gemini. Chave só no `/opt/postei/.env` (`XAI_API_KEY`).

Não colocar esse nicho na landing. Cliente pagante não deve gerar anúncio da Postei.

Se o Instagram conectado **não** for `@cliqueipostei.app`, a publicação (e o
agendador) acrescentam `Siga o Postei: @cliqueipostei.app` na legenda — sem
duplicar se o texto já tiver o @. No feed oficial da casa, a menção não entra.

---

## 11. Hashtags de alcance

Não é o modelo que escolhe o bloco final. Ele só manda 3–5 tags do **assunto
deste post**. O código (`postei/src/hashtags.js`) completa com banco de nicho
(tamanho médio, PT-BR) + 1–2 de comunidade, filtra mega/spam (`#viral`,
`#brasil`, `#dicas`) e varia o conjunto pelo título — o mesmo bloco em todo
o lote parece spam para o Instagram.

Teto: 10 no Instagram, 5 no LinkedIn. Banco vive no JSON do nicho (`hashtags.nicho`
/ `hashtags.comunidade`). Sem o campo, cai no fallback do arquivo.

## 12. Zip do pacote

No lote, **Baixar zip**. Motor monta na hora (`GET /lotes/:id/zip`): imagens
numeradas + `LEGENDAS.txt` (e pasta `linkedin/` se o pacote for das duas
redes). Marca própria já sai com `@cliqueipostei.app` no txt. Sem gravar o
zip no disco.

## 13. Marca d'água do teste grátis

Plano `teste` (2 posts): cada arte sai com um selo pequeno `P postei` no canto
inferior direito, opacidade baixa. Plano pago e cortesia não levam. O flag
fica em `pacote.marcaDagua` — trocar foto no teste reaplica o selo.

---

## 14. Deploy e caminhos

```bash
# Na pasta do repo (Git Bash / WSL)
./deploy.sh          # motor + web
./deploy.sh web
./deploy.sh motor
```

| Caminho servidor | |
|---|---|
| `/opt/postei` | motor · pm2 `postei` · :4710 |
| `/opt/postei-web` | painel · pm2 `postei-web` · :4720 |
| `/docker/n8n/dinamico/postei.yml` | Traefik |
| Segredos | `/opt/postei-web/.env.production`, `/opt/postei/.env` · mode 600 |

Deploy envia **só o que o git rastreia**. Arquivo novo sem `git add` não sobe.

---

## 15. Armadilhas (além da DOCUMENTACAO.md)

1. **PowerShell + backticks** ao escrever YAML no SSH — quebra `Host(\`...\`)` do Traefik; preferir `scp` de arquivo local.  
2. **Cookie OAuth entre domínios** — state assinado (já corrigido).  
3. **Webhook MP** — URL do painel manda mais que o body; teste `123456` → 200.  
4. **Instagram App ID ≠ Meta App ID**.  
5. **`notification_url` no preapproval** pode ser ignorado pelo MP.  
6. Landing com **poucos itens na esteira** = cards “repetidos” (a esteira duplica a lista no CSS).  

---

## 16. Checklist “pronto para cliente pagar e conectar IG”

- [x] DNS postei.amconsultoria.tech → VPS  
- [x] Traefik + SSL nos dois hosts  
- [x] SITE_URL domínio novo  
- [x] Webhook MP produção domínio novo + teste 200  
- [x] URLs Instagram login empresa (novo + legado)  
- [x] OAuth state assinado deployado  
- [x] Conexão Instagram testada (Alan)  
- [ ] 1 pagamento real de ponta a ponta (recomendado)  
- [ ] Instagram: URLs de desautorização/exclusão só no novo (legado opcional)  
- [ ] Site raiz amconsultoria.tech (futuro)  
- [ ] E-mail @amconsultoria.tech (futuro)  

---

## 13. Diário de evolução (append-only)

### 2026-08-11

- Análise completa do monorepo Postei; maturação MVP em produção.  
- Fase 1+2 mídia (foto própria, Reels upload); commit `c859b2e`; deploy.  
- Landing: nichos abertos + tema escuro AM `#9FE870`; esteira dupla restaurada.  
- Domínio `amconsultoria.tech` comprado (Hostinger); DNS A `@`/`postei` → VPS.  
- Traefik dual host; SITE_URL novo; cert SAN.  
- Webhook MP migrado para domínio novo; simulação 200 OK.  
- Instagram: URLs OAuth no domínio novo; bug estado_invalido → state HMAC `9c31c9a`.  
- Instagram conectado com sucesso no domínio novo.  
- Este arquivo de conhecimento criado.

---

## 14. Como atualizar esta memória

Sempre que:

- mudar domínio, env, Traefik, MP, Meta, planos, ou achar armadilha nova  

→ acrescente em **§13 Diário** e ajuste a seção relevante.  
Se o procedimento for longo, crie `docs/NOME.md` e linke no topo.
