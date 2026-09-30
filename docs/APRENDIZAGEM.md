# Postei — caderno de aprendizagem

O que decidimos, por quê, e o que não pode se perder na próxima sessão.
Complementa a memória viva (`CONHECIMENTO.md`) e a arquitetura (`DOCUMENTACAO.md`).

Última atualização: **2026-08-19**.

---

## Como ler

| Arquivo | Papel |
|---|---|
| Este arquivo | Decisões + aprendizados. Abrir antes de mudar regra de acesso, hashtag, marca ou teste. |
| [`CONHECIMENTO.md`](CONHECIMENTO.md) | Memória operacional (endereços, deploy, armadilhas). |
| [`../DOCUMENTACAO.md`](../DOCUMENTACAO.md) | Como o sistema é. |

Repo: `github.com/alankardecm/postei` · pasta local: `Documents\00 - 2026\35.1 PROJETOS PARTICULARES\ESTEIRA-IA-CONTEUDO\` · no ar: `https://postei.amconsultoria.tech`

---

## 1. Duas listas de e-mail, não uma

Cortesia (plano Estúdio sem cobrança) **não** é o mesmo que dono da marca.

| Lista | Quem | O que libera |
|---|---|---|
| `CORTESIAS` | Alan, **Juliana**, Junior | Plano Estúdio, sem pagar |
| `DONOS_MARCA` | **só Alan e Junior** | Nicho interno `postei-marca` + Imagine da xAI |

Juliana testa o produto do **cliente**. Não gera anúncio da casa e não queima `XAI_API_KEY`.

Código: `postei-web/src/lib/planos.ts`. O painel pede nichos internos com `ehAcessoMarcaPropria`, não com `ehCortesia`. O motor recusa `interno` sem o header `x-postei-internos: 1`. A API de tarefas ainda barra `nicho === "postei-marca"` antes de reservar cota.

**Aprendizado:** uma lista só mistura “pode usar de graça” com “pode gastar a chave da casa”. Separar agora evita a Juliana (ou qualquer piloto) aparecer no seletor da marca própria.

---

## 2. Marca própria em outro Instagram precisa do @

Perfil oficial: `@cliqueipostei.app`.

Se o lote é `postei-marca` **e** o Instagram conectado **não** é esse, a publicação (botão e agendador) acrescenta:

`Siga o Postei: @cliqueipostei.app`

No feed da casa, a menção não entra. Se o texto já tem o @, não duplica. O painel mostra o aviso e a linha extra antes de publicar.

A menção entra **na hora de publicar**, não na geração: o mesmo lote pode ir para o IG oficial ou para o do Alan. No zip (postagem manual), a marca própria já leva o @ no `LEGENDAS.txt`, porque zip = outro lugar.

Código: `deveMencionarMarca` / `MENCAO_INSTAGRAM_MARCA` em `planos.ts`; `montarLegenda` em `publicacao.ts`; zip em `postei/src/entrega.js`.

**Aprendizado:** @ na arte não redireciona. Só menção na legenda é clicável no Instagram. Por isso a regra é de publicação, não de Imagine.

---

## 3. Hashtag é de alcance, não de enfeite

Vale para **todo** post e **todo** usuário.

O modelo só manda 3–5 tags **deste assunto**. O código monta o resto:

- banco de nicho, tamanho médio, PT-BR (`hashtags.nicho` no JSON)
- 1–2 de comunidade
- joga fora mega/spam (`viral`, `brasil`, `dicas`, `fyp`, `love`…)
- o conjunto muda com o título — o mesmo bloco em 30 posts parece spam

Teto: 10 no Instagram, 5 no LinkedIn. Sem campo no JSON, cai no fallback de `hashtags.js`.

**Aprendizado (já era regra do projeto):** o que o modelo ignora vira código. Instruir “7 a 10 hashtags específicas” no prompt não impede `#dicas`. Filtrar e completar no código.

---

## 4. Teste grátis leva a cara da Postei

Plano `teste` (2 posts): selo pequeno `P postei` no canto inferior direito, opacidade baixa. Quem paga ou tem cortesia **não** leva.

O flag vai no `pacote.marcaDagua`. Trocar foto no teste reaplica. Contraste do selo segue o fundo (claro/escuro).

**Aprendizado:** sutil ≠ invisível. Pill creme no fundo escuro; pill escura no fundo claro. Sem isso o selo some na paleta do assinante.

---

## 5. Zip do pacote no painel

No lote: **Baixar zip**. Motor `GET /lotes/:id/zip`, painel `/api/lotes/:id/zip`.

- imagens numeradas + `LEGENDAS.txt`
- duas redes → pastas `instagram/` e `linkedin/`
- monta na hora, não grava zip no disco
- sem dependência nova (ZIP com deflate nativo)

**Aprendizado:** o script Python `empacotar-entrega.py` era entrega na mão. O assinante precisa do mesmo pelo painel, autenticado, sem a chave do motor no navegador.

---

## 6. Deploy desta leva

| Commit | O quê |
|---|---|
| `ac57809` | Marca própria restrita, @, hashtags, marca d'água, LinkedIn, landing |
| `ce47879` | Zip do pacote |

Os dois já estão em `main` e na VPS (`./deploy.sh`). Pacotes gerados **antes** não ganham hashtag nova nem selo sozinhos — precisa gerar de novo.

Arquivo **novo** sem `git add` não sobe. O `deploy.sh` aborta se achar untracked em `postei/` ou `postei-web/`.

Não versionar `credenciais linkedin.txt`.

---

## 7. Regras que a próxima sessão não pode quebrar

1. Não juntar Juliana em `DONOS_MARCA`.
2. Não mostrar `postei-marca` na landing.
3. Não gastar xAI fora da marca própria.
4. Não confiar no modelo para hashtag, repetição ou busca de foto — é código.
5. `assinanteId` sai da sessão (`getUser()`), nunca do body.
6. Deploy só o que o git rastreia; `./deploy.sh` pelo Git Bash.
7. VPS `217.196.61.190` é da AM / Postei — **nada da NetTurbo**.
8. Reel por IA só em `postei-marca` e `am-consultoria`. Imagine não recebe card de cliente. AM não regenera cara: `assets/am/canonico.jpg`.
9. Reel do cliente é Ken Burns (`ffmpeg`), custo zero. Sempre prévia: só vira `post.video` depois de aceitar. Sem aceitar, não publica.
10. Hermes não lê `/opt/postei` e não publica sozinho. Painel: `https://hermes.amconsultoria.tech`. Sem `9119` em `0.0.0.0`. Sem WhatsApp do Hermes.
11. Status de publicar/agendar vive no banco (`publicacoes` / `publicacoes_linkedin`). A tela não pode ser a única memória — F5 tem que reler.

---

## 9. LinkedIn: F5 não é cancelar (18/08)

O lote de 10 cards (`ia-para-empresas_alan-moreira_1787083817957`) publicou o card 01 e agendou 03, 04, 06 e 07. Depois do F5 os botões voltaram. No LinkedIn e no banco estava tudo lá.

Causa: `PublicarLinkedin` (e o do Instagram) guardava “publicado/agendado” no `useState`. A seção **Na fila** do painel só lia `publicacoes` (Instagram).

No ar: fila mistura as duas redes; API não republica o mesmo card.  
Ainda local: hidratar o selo no card do lote.

**Aprendizado:** se o assinante dá F5 no meio do “Agendando…”, olhar o banco e a fila — não o botão.

---

## 10. Hermes na mesma VPS (18–19/08)

Uma VPS só. O agente inteiro entra no container. Painel público com senha, não porta nua.

Detalhe operacional: `Documents/00 - 2026/35.1 PROJETOS PARTICULARES/HERMES/DIA-2026-08-18.md`.

**Aprendizado:** túnel SSH nesta Hostinger cai. Subdomínio + Traefik + senha é o caminho. DNS A precisa existir **antes** do Let’s Encrypt (senão fica o certificado `TRAEFIK DEFAULT CERT` até reiniciar o Traefik).

---

## 8. O que ainda está em aberto

- Piloto Juliana: ainda não publicou; precisa ver a versão nova e dizer por que não postou.
- Cópia de backup fora do servidor.
- Contrato de comissionamento do comercial.
- Revisão jurídica dos docs.
- Agendar Reel (hoje só publicar na hora).
- Layout 9:16 nativo no satori (Ken Burns ainda faz faixa no 4:5).
- WhatsApp (Evolution já está no servidor).
- Perfis Hermes (AM comercial / Postei) — combinados, não criados.
- Telegram do Hermes.
- Selo publicado/agendado no card do lote (código local, não no ar).

Domínio, MP produção e Instagram no `amconsultoria.tech` já estavam feitos antes desta leva.
