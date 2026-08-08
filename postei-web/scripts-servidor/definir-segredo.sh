#!/usr/bin/env bash
#
# Grava um segredo no .env de produção sem que ele passe por log, histórico
# de shell ou pela conversa com o assistente.
#
#   ./definir-segredo.sh INSTAGRAM_APP_SECRET
#
# Sem argumento, pergunta o nome da variável.
set -euo pipefail

ENV="/opt/postei-web/.env.production"
VAR="${1:-}"

if [ -z "$VAR" ]; then
  read -r -p "Nome da variável (ex.: INSTAGRAM_APP_SECRET): " VAR
fi

if [ -z "$VAR" ]; then
  echo "✗ Nome vazio. Nada foi alterado."
  exit 1
fi

# -s esconde o que é digitado. É esperado a tela não mostrar nada.
read -r -s -p "Valor de $VAR (não aparece na tela): " VALOR
echo

if [ -z "$VALOR" ]; then
  echo "✗ Nada digitado. Nada foi alterado."
  exit 1
fi

cp "$ENV" "$ENV.bak-$(date +%Y%m%d-%H%M%S)"

# Remove a linha antiga (se houver) e grava a nova.
sed -i "/^${VAR}=/d" "$ENV"
printf '%s=%s\n' "$VAR" "$VALOR" >> "$ENV"
chmod 600 "$ENV"

echo "✓ $VAR gravada (${#VALOR} caracteres)."

cd /opt/postei-web
pm2 restart postei-web --update-env >/dev/null 2>&1
sleep 5

if curl -sf -m 15 -o /dev/null http://127.0.0.1:4720/; then
  echo "✓ Painel reiniciado e respondendo."
else
  echo "✗ O painel não respondeu após reiniciar. Veja: pm2 logs postei-web"
  exit 1
fi
