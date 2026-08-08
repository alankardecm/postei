#!/usr/bin/env bash
#
# Deploy do Postei para a VPS.
#
#   ./deploy.sh            # motor + plataforma
#   ./deploy.sh motor      # so o motor
#   ./deploy.sh web        # so a plataforma
#
# Envia apenas o que o git conhece -- assim nada de node_modules, nada de
# .env e nada de pacote gerado sobe junto. Os arquivos de segredo do servidor
# NUNCA sao tocados.
set -euo pipefail

SERVIDOR="root@217.196.61.190"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALVO="${1:-tudo}"

azul()    { printf '\n\033[1;36m%s\033[0m\n' "$1"; }
ok()      { printf '   \033[0;32m✓\033[0m %s\n' "$1"; }
aviso()   { printf '   \033[0;33m!\033[0m %s\n' "$1"; }
morrer()  { printf '   \033[0;31m✗ %s\033[0m\n' "$1"; exit 1; }

cd "$RAIZ"

# ---------------------------------------------------------------------------
# Guardas antes de qualquer coisa
# ---------------------------------------------------------------------------
azul "Verificando"

if ! git diff --quiet || ! git diff --cached --quiet; then
  aviso "há mudanças não commitadas — elas VÃO subir mesmo assim"
  git status --short | head -8 | sed 's/^/     /'
fi

ssh -o ConnectTimeout=10 "$SERVIDOR" 'true' 2>/dev/null || morrer "não consegui conectar em $SERVIDOR"
ok "servidor acessível"

# Lista os arquivos rastreados de um diretorio e envia por tar.
enviar() {
  local origem="$1" destino="$2"
  local arquivos
  arquivos=$(git ls-files "$origem")
  [ -n "$arquivos" ] || morrer "nenhum arquivo rastreado em $origem"
  echo "$arquivos" | tar czf - -T - | ssh "$SERVIDOR" "mkdir -p $destino && tar xzf - -C $destino --strip-components=1"
}

# ---------------------------------------------------------------------------
# Motor
# ---------------------------------------------------------------------------
if [ "$ALVO" = "tudo" ] || [ "$ALVO" = "motor" ]; then
  azul "Motor → /opt/postei"

  enviar postei /opt/postei
  ok "código enviado"

  ssh "$SERVIDOR" 'cd /opt/postei && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1' \
    && ok "dependências em dia"

  # As fontes nao vao no repo (sao baixaveis); garante que existem.
  ssh "$SERVIDOR" '[ -f /opt/postei/assets/fontes/Inter-Regular.ttf ] || (cd /opt/postei && bash scripts/baixar-fontes.sh >/dev/null 2>&1)' \
    && ok "fontes presentes"

  ssh "$SERVIDOR" 'pm2 restart postei --update-env >/dev/null 2>&1'
  sleep 3
  ssh "$SERVIDOR" 'curl -sf -m 10 http://127.0.0.1:4710/saude >/dev/null' \
    && ok "motor respondendo" || morrer "motor não respondeu após reiniciar"
fi

# ---------------------------------------------------------------------------
# Plataforma
# ---------------------------------------------------------------------------
if [ "$ALVO" = "tudo" ] || [ "$ALVO" = "web" ]; then
  azul "Plataforma → /opt/postei-web"

  enviar postei-web /opt/postei-web
  ok "código enviado"

  ssh "$SERVIDOR" 'cd /opt/postei-web && npm install --no-audit --no-fund >/dev/null 2>&1' \
    && ok "dependências em dia"

  # O build fica com a saida visivel: e a etapa que mais falha, e esconder o
  # erro so faz perder tempo.
  echo "   compilando (leva ~1 min)…"
  ssh "$SERVIDOR" 'cd /opt/postei-web && npm run build 2>&1 | tail -4' | sed 's/^/     /'

  ssh "$SERVIDOR" 'cd /opt/postei-web && pm2 restart postei-web --update-env >/dev/null 2>&1'
  sleep 6
  ssh "$SERVIDOR" 'curl -sf -m 15 -o /dev/null http://127.0.0.1:4720/' \
    && ok "plataforma respondendo" || morrer "plataforma não respondeu após reiniciar"
fi

# ---------------------------------------------------------------------------
azul "Pronto"
printf '   painel:  https://postei.srv1121163.hstgr.cloud\n'
ssh "$SERVIDOR" 'pm2 list 2>/dev/null | grep -E "postei" | awk -F"│" "{printf \"   %-14s %s\n\", \$3, \$8}"'
