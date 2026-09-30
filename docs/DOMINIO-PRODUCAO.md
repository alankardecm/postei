# Domínio, produção, pagamentos e Instagram

Procedimento operacional do Postei em **https://postei.amconsultoria.tech**.  
Conhecimento condensado também em [`CONHECIMENTO.md`](CONHECIMENTO.md).

---

## 1. DNS (Hostinger)

**Domínio:** `amconsultoria.tech`  
**Nameservers:** deixar os da Hostinger (`artemis` / `hermes` ou equivalentes).  
**Não** resetar registros DNS à toa.

| Tipo | Nome | Conteúdo | Resultado |
|---|---|---|---|
| A | `@` | `217.196.61.190` | amconsultoria.tech |
| CNAME | `www` | `amconsultoria.tech` | www |
| A | `postei` | `217.196.61.190` | **postei.amconsultoria.tech** |
| A | `hermes` | `217.196.61.190` | **hermes.amconsultoria.tech** (painel do agente, 19/08) |

Conferir:

```powershell
nslookup postei.amconsultoria.tech 8.8.8.8
```

Deve retornar `217.196.61.190`.

Na compra: pular “criar site” e “e-mail” da Hostinger se o app roda na VPS própria.

---

## 2. Traefik (servidor)

Arquivos: `/docker/n8n/dinamico/postei.yml` (Postei) e `hermes.yml` (Hermes → `http://172.16.1.1:9119`).  
Não publicar `9119` em `0.0.0.0`. Sem o A `hermes`, o Traefik fica com certificado default; depois do DNS, `docker restart n8n-traefik-1`.

```yaml
http:
  routers:
    postei-painel:
      rule: "Host(`postei.amconsultoria.tech`) || Host(`postei.srv1121163.hstgr.cloud`)"
      entrypoints: [web, websecure]
      service: postei-painel
      tls:
        certresolver: mytlschallenge
    postei-supabase:
      rule: "Host(`api.postei.srv1121163.hstgr.cloud`)"
      # ...
```

Após editar: `docker restart n8n-traefik-1` (ou confiar no file watch).  
Certificado deve listar ambos os hosts do painel (SAN).

**Atenção:** não editar esse YAML via PowerShell com backticks — use `scp` de um arquivo local.

---

## 3. Variáveis de ambiente

`/opt/postei-web/.env.production` (trechos relevantes):

```env
NEXT_PUBLIC_SITE_URL=https://postei.amconsultoria.tech
NEXT_PUBLIC_SUPABASE_URL=https://api.postei.srv1121163.hstgr.cloud
NEXT_PUBLIC_INSTAGRAM_APP_ID=1061113693070928
INSTAGRAM_APP_SECRET=...
MP_ACCESS_TOKEN=...
MP_WEBHOOK_SECRET=...
POSTEI_SEGREDO_IMAGEM=...
POSTEI_API_KEY=...
POSTEI_MOTOR_URL=http://127.0.0.1:4710
```

Depois de mudar: `pm2 restart postei-web --update-env`.

---

## 4. Mercado Pago — passo a passo

### 4.1 Painel

1. [developers.mercadopago.com.br](https://www.mercadopago.com.br/developers)  
2. Aplicação de **produção** do Postei  
3. **Webhooks / Notificações** → **Modo de produção**  

### 4.2 URL

```text
https://postei.amconsultoria.tech/api/pagamento/webhook
```

### 4.3 Eventos

- **Planos e assinaturas** (obrigatório para o Postei)

### 4.4 Assinatura secreta

Deve ser a mesma de `MP_WEBHOOK_SECRET` no servidor.  
Não regenerar sem atualizar o `.env` e reiniciar o PM2.

### 4.5 Teste

Simular notificação com Data ID `123456` → esperado **200 - OK**.

### 4.6 Como o Postei libera plano (resiliência)

| Caminho | Observação |
|---|---|
| Webhook | Rápido; URL do **painel MP** é a que vale na prática |
| `?pagamento=voltou` | Cliente volta do checkout |
| Cron / reconciliação | Consulta API do MP por `external_reference` — **não depende do hostname** |

Código: `lib/mercadopago.ts`, `api/pagamento/assinar`, `api/pagamento/webhook`, `lib/assinatura-sync.ts`.

Novas assinaturas usam:

- `back_url` = `{SITE_URL}/painel?pagamento=voltou`  
- `notification_url` = `{SITE_URL}/api/pagamento/webhook`  

---

## 5. Instagram — passo a passo

### 5.1 Meta Developers

1. [developers.facebook.com](https://developers.facebook.com) → app do Postei  
2. Produto **Instagram** (app IG **Postei-IG**, ID **1061113693070928**)  
3. Passo **4. Configurar o login da empresa no Instagram**  
4. Botão **Configurações do login da empresa**

### 5.2 URLs a cadastrar

```text
https://postei.amconsultoria.tech/api/instagram/retorno
https://postei.amconsultoria.tech/api/instagram/desconectar
https://postei.amconsultoria.tech/exclusao-de-dados
```

Manter legado se quiser:

```text
https://postei.srv1121163.hstgr.cloud/api/instagram/retorno
https://postei.srv1121163.hstgr.cloud/api/instagram/desconectar
https://postei.srv1121163.hstgr.cloud/exclusao-de-dados
```

### 5.3 Permissões no código

- `instagram_business_basic`  
- `instagram_business_content_publish`  

Cliente precisa de conta **profissional** (Empresa ou Criador).

### 5.4 Teste

1. https://postei.amconsultoria.tech/painel (domínio **oficial**)  
2. Conectar Instagram → autorizar → `@` no painel  

### 5.5 Erro “A autorização não conferiu”

= `estado_invalido`.  
Corrigido com **state HMAC** + forçar host do `SITE_URL` em `/api/instagram/conectar` (ver `lib/instagram.ts`).  
Se voltar a acontecer: ver log `[postei][ig] estado_invalido` no PM2.

### 5.6 Igual para todos os usuários?

**Sim.** Um app Meta, um domínio, N assinantes. Cada um conecta a própria conta no próprio login Supabase.

---

## 6. O que o domínio antigo ainda faz

| Host legado | Status |
|---|---|
| Abrir site/painel | Funciona (Traefik dual) |
| Webhook se alguém ainda apontar | Rota existe |
| OAuth se redirect for só o novo | Volta sempre no SITE_URL |

**Clientes novos:** só divulgar `postei.amconsultoria.tech`.  
Manter legado 2–4 semanas; depois remover do Traefik com calma.

---

## 7. Deploy

```bash
./deploy.sh web    # só painel
./deploy.sh motor  # só motor
./deploy.sh        # os dois
```

Local do código:  
`Documents\00 - 2026\35.1 PROJETOS PARTICULARES\ESTEIRA-IA-CONTEUDO`

---

## 8. Contatos / IDs úteis

| Item | Valor |
|---|---|
| VPS | `217.196.61.190` |
| URL Postei | https://postei.amconsultoria.tech |
| Instagram App ID | 1061113693070928 |
| Meta App ID | 1020466784319299 |
| Webhook MP | `/api/pagamento/webhook` |
| OAuth IG retorno | `/api/instagram/retorno` |
