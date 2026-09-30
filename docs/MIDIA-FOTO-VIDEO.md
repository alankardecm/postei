# Postei — mídia própria (foto + vídeo/Reels)

**Status:** implementado, commitado, **em produção** (Fase 1 + Fase 2)  
**Data início:** 2026-08-11  
**Commit da feature:** `c859b2e`  
**Push:** `origin/main` (github.com/alankardecm/postei)  
**Deploy:** 2026-08-11 — motor + web OK em `https://postei.srv1121163.hstgr.cloud`  
**Projeto:** Postei (particular) — pasta `ESTEIRA-IA-CONTEUDO`

---

## Ponto de recuperação (antes desta feature)

| | |
|---|---|
| **Commit SHA (local)** | `548fb8bf4b128e03e032e3785fc0372760c8b2cb` |
| **Mensagem** | `fix: ampliar o slide sobre a pagina, sem abrir outra aba` |
| **Branch** | `main` (estava *ahead* 28 de `origin/main` no início do trabalho) |

### Como voltar se algo quebrar

```bash
cd "C:\Users\alan.moreira\Documents\00 - 2026\35.1 PROJETOS PARTICULARES\ESTEIRA-IA-CONTEUDO"

# Ver o que mudou
git status
git diff

# Descartar TODAS as mudanças não commitadas desta feature (cuidado)
git checkout -- postei/ postei-web/
git clean -fd postei/src postei-web/src docs/

# Ou voltar o working tree inteiro ao commit de recuperação (NÃO use se tiver
# outras mudanças locais que queira manter — no início havia 28 commits locais
# já à frente do origin; este SHA é o HEAD daquele momento)
git reset --hard 548fb8bf4b128e03e032e3785fc0372760c8b2cb
```

**Importante:** `reset --hard` apaga trabalho não commitado. Preferir reverter só os arquivos desta feature se houver outros WIP.

### Backup automático por post (runtime)

Ao trocar a arte de um post, o motor grava uma pasta:

```
saida/<assinante>/<lote>/_backup_arte_<timestamp>/
  pacote.json
  post-01.jpg          # (arquivos de imagem do post, se existiam)
  post-01-01.jpg       # slides do carrossel
  ...
```

Para restaurar **um post** manualmente no servidor:

1. Abrir o `_backup_arte_*` mais recente daquele lote  
2. Copiar os arquivos de imagem de volta para a pasta do lote  
3. Restaurar o `pacote.json` do backup (ou só o item `posts[i]` se souber editar JSON)

---

## O que esta feature faz

### Fase 1 — Foto própria / outra foto do Pexels

No painel do lote, em cada post:

1. **Trocar foto (Pexels)** — nova busca com a `buscaImagem` do post e re-render da arte  
2. **Enviar minha foto** — upload JPEG/PNG/WebP → normaliza → re-render card ou capa do carrossel  

Reaproveita `satori` + layouts existentes. **Não** chama LLM. **Não** altera legenda.

### Fase 2 — Vídeo / Reels

1. **Enviar MP4** no post  
2. **Publicar como Reel** (ou agendar com o mesmo fluxo de publicação, se `video` presente e modo reel)  
3. URL pública assinada para a Meta baixar o MP4 (mesmo padrão HMAC da imagem)

---

## Arquivos tocados (checklist)

### Motor (`postei/`)

| Arquivo | Mudança |
|---|---|
| `src/foto.js` | `prepararFotoDeBytes` (upload → data URI JPEG) |
| `src/refazer-arte.js` | **NOVO** — backup + re-render + grava pacote |
| `src/index.js` | rotas `POST .../arte`, `POST .../video`, `GET .../video/:arquivo`; limit JSON maior só nessas rotas |

### Painel (`postei-web/`)

| Arquivo | Mudança |
|---|---|
| `src/lib/motor.ts` | helpers `refazerArte` / upload (via fetch nas rotas Next) |
| `src/lib/instagram.ts` | `publicarReels` |
| `src/lib/imagem-publica.ts` | reutilizado para `.mp4` (mesmo HMAC) |
| `src/lib/publicacao.ts` | ramo Reel se `post.video` + `modo: 'reels'` |
| `src/app/api/lotes/.../arte/route.ts` | **NOVO** proxy autenticado |
| `src/app/api/lotes/.../video/route.ts` | **NOVO** proxy autenticado |
| `src/app/api/lotes/.../video/[arquivo]/route.ts` | **NOVO** servir vídeo logado |
| `src/app/api/publico/imagem/...` | aceita servir mp4 se arquivo for mp4 (ou rota dedicada) |
| `src/components/painel/MidiaPost.tsx` | **NOVO** UI foto + vídeo |
| `src/components/painel/Publicar.tsx` | opção Reel quando há vídeo |
| `src/components/painel/EditarPost.tsx` | inclui MidiaPost |
| `src/app/api/instagram/publicar/route.ts` | aceita `modo: 'reels' \| 'feed'` |
| `docs/MIDIA-FOTO-VIDEO.md` | este arquivo |

### O que **não** muda (de propósito)

- Geração de lote (`POST /tarefas`)  
- Planos / cotas de LLM  
- DNA / paleta (continua a mesma na re-render)  
- Fluxo de carrossel só-imagem existente  
- Deploy / PM2 / secrets  

---

## Contrato das APIs novas

### Motor — re-render de arte

```
POST /lotes/:loteId/posts/:indice/arte
Headers: x-postei-chave, x-postei-assinante
Body JSON (até ~15 MB):
  { "fonte": "pexels" }
  { "fonte": "upload", "imagemBase64": "<base64 sem data:...>", "mime": "image/jpeg" }

Resposta 200: { ok: true, post, backup: "<pasta relativa>" }
```

### Motor — vídeo

```
POST /lotes/:loteId/posts/:indice/video
Body: { "videoBase64": "...", "mime": "video/mp4" }
→ grava video-XX.mp4, post.video = nome

GET /lotes/:loteId/video/:arquivo
→ bytes do mp4 (mesma auth chave+assinante)
```

### Painel Next

```
POST /api/lotes/:loteId/posts/:indice/arte
  FormData: arquivo (opcional) | JSON { fonte: "pexels" }

POST /api/lotes/:loteId/posts/:indice/video
  FormData: arquivo

POST /api/instagram/publicar
  { loteId, indice, modo?: "feed" | "reels" }
```

---

## Limites

| | |
|---|---|
| Foto upload | max **8 MB** original; redimensiona para largura ≤ 1080 |
| Formatos foto | JPEG, PNG, WebP |
| Vídeo | max **80 MB**, só `video/mp4` |
| Lista tipográfica | ao enviar foto, o layout passa a **foto** (a lista pura não tem espaço de imagem) |
| Carrossel | só a **capa** recebe a foto (igual geração original) |

---

## Deploy (só com autorização)

```bash
# Na máquina do Alan, depois de commit local aprovado:
./deploy.sh          # ou deploy.sh motor / deploy.sh web
```

**Não executar** sem o Alan pedir. Servidor: `/opt/postei` + `/opt/postei-web`.

---

## Histórico de mudanças

| Data | O quê |
|---|---|
| 2026-08-11 | Doc + ponto de recuperação `548fb8b` |
| 2026-08-11 | **Fase 1:** `refazer-arte.js`, rotas `/arte`, UI MidiaPost (Pexels + upload) |
| 2026-08-11 | **Fase 2:** gravação MP4, `publicarReels`, UI “Publicar como Reel”, URL pública HMAC para `.mp4` |
| 2026-08-11 | Parser JSON do motor: rotas arte/video com limit alto; demais rotas 1mb |
| 2026-08-11 | Cache da imagem do painel: `no-cache` + query `?t=` após re-render |
| 2026-08-11 | **Commit** `c859b2e` + **push** `main` + **deploy** motor+web (autorização C) |

### Ainda NÃO feito (de propósito)

- Agendar Reel (só publicar agora com modo reels; agendamento continua feed)
- Layout 9:16 nativo no satori (hoje o Ken Burns faz faixa na arte 4:5)

### Fase 3 — Gerar Reel da marca (2026-08-16)

Só Alan e Junior (`DONOS_MARCA`). Dois ramos internos:

| Ramo | O que o botão faz |
|---|---|
| `postei-marca` | Imagine vídeo 6 s, câmera lenta no anúncio já pronto (letterbox 9:16 creme). Texto/logo parados. |
| `am-consultoria` | Imagine 10 s, apresentador do `assets/am/canonico.jpg` fala o título+legenda em PT-BR. |

Botão **Gerar Reel** no post. Motor `POST /lotes/:id/posts/:indice/reel`. Painel `/api/lotes/.../reel`. Juliana não vê o botão nem os ramos. Cliente pagante continua só com upload de MP4.

Não gerar o lote inteiro: 3–4 Reels/semana. ~US$ 0,84 (6 s) a ~US$ 1,40 (10 s) em 720p.

### Fase 4 — Ken Burns do cliente + prévia (2026-08-16)

Todo plano, lote de Instagram. Sem API.

1. **Gerar Reel** monta MP4 9:16 (8 s, zoom/pan no card) e grava `preview-XX.mp4`
2. O painel mostra o vídeo. **Usar este Reel** vira `video-XX.mp4`. **Não usar** apaga a prévia
3. **Publicar como Reel** só aparece depois de aceitar. Prévia não sobe na Meta

Motor: `POST /lotes/:id/posts/:i/reel` (prévia) e `POST .../reel/decisao` `{ acao: aceitar|recusar }`.
Requer `ffmpeg` no PATH do motor (local e VPS).

---

## Testes manuais recomendados (antes de produção)

1. Abrir um lote existente → post com foto → **Trocar foto (Pexels)** → imagem muda, legenda igual  
2. **Enviar minha foto** → arte usa a foto enviada  
3. Carrossel → só capa muda; slides 2..N iguais (ou re-render tipográfico intacto)  
4. Publicar feed (imagem) como antes  
5. Enviar MP4 → **Publicar como Reel** (conta Instagram de teste)  
6. Confirmar pasta `_backup_arte_*` criada no disco do motor  
7. Restaurar a partir do backup se a arte nova desagradar  
