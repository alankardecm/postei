# Screencast Meta — App Review do Postei

Dois vídeos. Mesma gravação serve de base; o revisor quer **um por permissão**.

| Vídeo | Permissão | O que o revisor precisa ver |
|---|---|---|
| A | `instagram_business_basic` | Login no Instagram + nome da conta no painel |
| B | `instagram_business_content_publish` | Clique em Publicar + post no Instagram |

Grave em **1080p**, janela do Chrome em tela cheia, sem cortar a barra de endereço.  
Windows: `Win + G` (Xbox Game Bar) ou OBS.  
Fale baixo e claro. Se preferir, mute e coloque legendas no envio.

---

## Antes de apertar Rec

- [ ] Instagram da gravação é **profissional** (Empresa ou Criador), **não** conta pessoal
- [ ] Essa conta **não** precisa ser tester do app — use uma conta real (a sua AM serve)
- [ ] No painel do Postei: Instagram **desconectado** (para o vídeo A mostrar o login)
- [ ] Já existe um **pacote Instagram** gerado (2 posts de teste bastam)
- [ ] Aba pronta: `https://postei.amconsultoria.tech/painel`
- [ ] Outra aba: Instagram web logado nessa conta profissional
- [ ] Zoom do Windows em 100% (não 125%)
- [ ] Sem senha, cartão ou `.env` na tela

Se o Instagram já estiver conectado: **Desconectar** antes do vídeo A.

---

## Vídeo A — `instagram_business_basic` (~90 segundos)

**O que você está provando:** o Postei pede login para saber *qual* Instagram é do assinante.

### Cena 1 — O produto (10s)
1. Abra `https://postei.amconsultoria.tech`
2. Mostre o hero (Instagram e LinkedIn)
3. Clique **Começar grátis** / **Entrar** e entre na sua conta

Fale: *“Postei. O assinante gera posts e publica na conta profissional dele.”*

### Cena 2 — O botão (10s)
1. Painel → role até **Instagram**
2. Deixe o botão **Conectar Instagram** bem visível no quadro
3. Clique nele

### Cena 3 — Autorização da Meta (obrigatória, 20–30s)
A tela **tem** que aparecer inteira: URL da Meta/Instagram + permissões.

1. Faça login se pedir
2. Mostre a lista de permissões
3. Clique em **Permitir** / **Allow**
4. Espere voltar para `postei.amconsultoria.tech/painel?ig=conectado`

Se pular essa tela (já autorizado), o Review recusa. Use uma conta que ainda não autorizou, ou Desconectar + revogar em instagram.com → Configurações → Apps.

### Cena 4 — A permissão em uso (15s)
1. No cartão Instagram do painel, mostre o **@username**
2. Passe o mouse em cima: “conexão válida até…”

Fale: *“instagram_business_basic: identificamos a conta conectada. Não lemos DM nem seguidores.”*

Pare a gravação.

---

## Vídeo B — `instagram_business_content_publish` (~2 min)

**O que você está provando:** o Postei só publica quando o assinante clica (ou agenda).

Pode começar **já conectado** (depois do vídeo A).

### Cena 1 — Pacote (15s)
1. Painel → um lote **Instagram**
2. Abra um post com arte visível

Fale: *“O assinante revisa o post gerado. A publicação é o clique dele.”*

### Cena 2 — Publicar (30s)
1. Clique **Publicar agora**
2. Clique **Confirmar publicação**
3. Espere **Publicado no Instagram**
4. **Não** corte aqui

### Cena 3 — Prova no Instagram (30s)
1. Vá na aba do Instagram (mesmo @)
2. Abra o perfil / feed
3. Mostre o post que acabou de sair (arte + legenda)

Fale: *“instagram_business_content_publish: criamos o container e publicamos a imagem e a legenda. Sem anúncio, sem comentário, sem mensagem.”*

### Cena 4 — Agendar (opcional, 20s, ajuda)
1. Volte no Postei, outro post
2. **Agendar** → escolha horário daqui a 1 hora
3. Mostre “Agendado para…”

Fale: *“O horário é do assinante. O Postei só dispara no momento escolhido.”*

Pare a gravação.

---

## Textos para colar no formulário da Meta

**Use case:** Tech Provider — o app atende vários negócios.

**Como o app usa `instagram_business_basic`:**
> O Postei é um SaaS de conteúdo. O assinante conecta a própria conta profissional do Instagram no painel (amconsultoria.tech/painel). Usamos esta permissão só para identificar a conta (ID e username) e mostrar no painel que a conexão está ativa. Não lemos mídia antiga, DMs, seguidores nem insights.

**Como o app usa `instagram_business_content_publish`:**
> Depois de revisar o post no painel, o assinante clica em Publicar agora ou Agenda um horário. Aí criamos o container de mídia e publicamos a imagem (ou carrossel) com a legenda que ele aprovou. Não publicamos sem essa ação. Não usamos a permissão para anúncios, comentários ou mensagens.

**Instruções para o revisor testar:**
> 1. Acesse https://postei.amconsultoria.tech/entrar  
> 2. Login: [e-mail de um tester que você criar]  
> 3. Senha: [senha temporária]  
> 4. Painel → Conectar Instagram com uma conta profissional  
> 5. Abra um lote → Publicar agora  
> Conta de teste do Instagram (profissional): [@seu.ig] — ou o revisor usa a dele.

Crie um usuário Postei só para a Meta (cortesia no `planos.ts` se precisar). **Não** dê o seu Gmail pessoal de admin.

---

## O que faz a Meta recusar

- Screencast sem a tela de **Permitir** da Meta
- Conta Instagram **pessoal** (tem que ser Empresa/Criador)
- Vídeo só do site, sem publicar de fato
- Um vídeo só para as duas permissões (envie A e B)
- App ainda sem **Business Verification**
- Reviewer sem login de teste e sem conseguir clicar em Conectar

---

## Depois de gravar

1. [developers.facebook.com](https://developers.facebook.com) → app Postei  
2. **App Review** → permissões  
3. Request **Advanced Access** em cada uma  
4. Sobe o vídeo A / B  
5. Cola os textos acima  
6. Espera e-mail (costuma ser dias, não horas)

Enquanto isso, cliente novo só publica se você colocar o Instagram dele como **tester** no app.  
Review aprovado = qualquer assinante que pagar conecta sozinho.
