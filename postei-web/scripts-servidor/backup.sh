#!/usr/bin/env bash
#
# Backup diário do Postei: banco + pacotes gerados.
#
# ⚠️ Isto é cópia LOCAL. Protege contra apagão acidental, bug e migração
# ruim — NÃO protege contra perder o servidor. Cópia externa continua
# pendente e é o próximo passo.
set -euo pipefail

DESTINO="/opt/backups/postei"
DIAS_A_MANTER=14
DATA=$(date +%Y%m%d-%H%M)

mkdir -p "$DESTINO"

log() { printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$1"; }

# ---------------------------------------------------------------------------
# Banco
# ---------------------------------------------------------------------------
# Só as tabelas do Postei: o banco é compartilhado com o CRM Limpa Nome, e
# despejar tudo junto faria a restauração de um produto mexer no outro.
TABELAS="public.assinaturas public.consumo public.links public.cliques public.contatos public.contas_instagram public.publicacoes"
ARGS=""
for t in $TABELAS; do ARGS="$ARGS -t $t"; done

if docker exec supabase-db pg_dump -U postgres $ARGS --data-only --column-inserts postgres \
     | gzip > "$DESTINO/banco-$DATA.sql.gz"; then
  log "banco: $(du -h "$DESTINO/banco-$DATA.sql.gz" | cut -f1)"
else
  log "ERRO no dump do banco"
  exit 1
fi

# A autenticação vive em outro schema e é o que impede o assinante de
# perder a conta.
docker exec supabase-db pg_dump -U postgres -n auth postgres \
  | gzip > "$DESTINO/auth-$DATA.sql.gz"
log "auth: $(du -h "$DESTINO/auth-$DATA.sql.gz" | cut -f1)"

# ---------------------------------------------------------------------------
# Pacotes gerados
# ---------------------------------------------------------------------------
if [ -d /opt/postei/saida ]; then
  tar czf "$DESTINO/pacotes-$DATA.tar.gz" -C /opt/postei saida 2>/dev/null || true
  log "pacotes: $(du -h "$DESTINO/pacotes-$DATA.tar.gz" | cut -f1)"
fi

# ---------------------------------------------------------------------------
# Configuração (sem segredo)
# ---------------------------------------------------------------------------
# Os .env NÃO entram: backup com segredo dentro vira outro problema. O que
# guardamos é a lista de variáveis esperadas, para saber o que reconfigurar.
{
  echo "# variáveis esperadas em $DATA (valores propositalmente omitidos)"
  grep -ohE '^[A-Z_]+=' /opt/postei/.env /opt/postei-web/.env.production 2>/dev/null | sort -u
} > "$DESTINO/variaveis-$DATA.txt"

# ---------------------------------------------------------------------------
# Rotação
# ---------------------------------------------------------------------------
find "$DESTINO" -type f -mtime +$DIAS_A_MANTER -delete
log "mantidos $(find "$DESTINO" -type f | wc -l) arquivos; espaço: $(du -sh "$DESTINO" | cut -f1)"

# ---------------------------------------------------------------------------
# Verificação — backup que não abre não é backup
# ---------------------------------------------------------------------------
if ! gzip -t "$DESTINO/banco-$DATA.sql.gz"; then
  log "ERRO: o arquivo do banco está corrompido"
  exit 1
fi
if [ -f "$DESTINO/pacotes-$DATA.tar.gz" ] && ! tar tzf "$DESTINO/pacotes-$DATA.tar.gz" >/dev/null; then
  log "ERRO: o arquivo dos pacotes está corrompido"
  exit 1
fi

log "backup íntegro"
