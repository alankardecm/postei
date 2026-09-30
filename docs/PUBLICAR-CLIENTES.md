# Publicar para qualquer cliente que pagar

Promessa de venda: **pagou → escolhe Instagram, LinkedIn ou os dois → publica ou agenda no painel.**

O Postei já faz isso no código. Falta a Meta e a LinkedIn liberarem **conta de terceiro** (não só a sua).

---

## 1. Instagram — App Review (o que destrava)

Hoje: você e testers do app.  
Depois do Review: qualquer conta profissional do cliente.

### No [developers.facebook.com](https://developers.facebook.com)

1. App **Postei** (pai Meta `1020466784319299`).
2. Confirme **Business Verification** da AM Consultoria (CNPJ 43.947.919/0001-08). Sem isso o Review não passa.
3. App em **Live** (não Development), se a tela pedir.
4. Produto **Instagram → API setup with Instagram login**.
5. Peça **Advanced Access** destas permissões (uma por vez, cada uma com vídeo):
   - `instagram_business_basic`
   - `instagram_business_content_publish`
6. URLs (já usadas):
   - Privacidade: `https://postei.amconsultoria.tech/privacidade`
   - Termos: `https://postei.amconsultoria.tech/termos`
   - Exclusão: `https://postei.amconsultoria.tech/exclusao-de-dados`
   - OAuth: `https://postei.amconsultoria.tech/api/instagram/retorno`

### Screencast (um por permissão)

Grave a tela, conta **profissional real** (não tester do dashboard):

1. Entra no Postei
2. Clica **Conectar Instagram**
3. Tela de autorização da Meta (obrigatório aparecer)
4. Volta no painel conectado
5. Gera ou abre um post
6. Clica **Publicar agora** e mostra o post no Instagram

Texto de uso (pode colar):

> O Postei é um SaaS. O assinante conecta a própria conta profissional do Instagram, gera um pacote de posts e publica ou agenda pelo painel. Usamos instagram_business_basic para identificar a conta e instagram_business_content_publish para criar o container e publicar a imagem e a legenda. Não lemos mensagens, não gerenciamos anúncios e não postamos sem o clique (ou o horário) do assinante.

Use case: **Tech Provider / app serve vários negócios.**

---

## 2. LinkedIn — perfil pessoal de qualquer cliente

Hoje: o seu perfil (app Standalone).  
O produto **Share on LinkedIn** é self-serve (`w_member_social`). Para cliente de fora do time:

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → app **Postei**
2. Aba **Settings**: verifique a **página da AM** (e-mail de verificação, se ainda estiver pendente)
3. Confirme produtos **Added**: Sign In with LinkedIn (OIDC) + Share on LinkedIn
4. Redirect: `https://postei.amconsultoria.tech/api/linkedin/retorno`
5. Se existir **Verify** / **Live** na Settings, complete (logo, privacidade, descrição)
6. Teste com um LinkedIn que **não** está em Team members. Se recusar, adicione a pessoa em Team members até o Verify sair — ou complete o Verify

**Página da empresa do cliente** não entra nesta venda. É outro produto (Community Management). A oferta atual é **feed pessoal**.

---

## 3. O que o cliente faz no Postei (já pronto)

1. Cria conta e assina
2. Conecta Instagram e/ou LinkedIn no painel
3. Ao gerar: escolhe **Instagram**, **LinkedIn** ou **Os dois**
4. Publica agora ou agenda

Conta Instagram precisa ser **Empresa ou Criador**.
