#!/bin/sh
# Backup Postgres → MinIO (bucket invoicepilot-backups)
# Tourne dans le service db-backup (compose). Image : postgres:16-alpine (pg_dump inclus).
set -eu

INTERVAL="${BACKUP_INTERVAL_SEC:-86400}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BUCKET="${STORAGE_BACKUP_BUCKET:-invoicepilot-backups}"
ENDPOINT="${STORAGE_ENDPOINT:-http://invoicepilot-minio:9000}"
PGHOST="${PGHOST:-invoicepilot-postgres}"
PGUSER="${POSTGRES_USER:-invoicepilot}"
PGDATABASE="${POSTGRES_DB:-invoicepilot_ai}"

echo "[backup] tools…"
apk add --no-cache curl ca-certificates >/dev/null

if ! command -v mc >/dev/null 2>&1; then
  echo "[backup] download mc…"
  curl -fsSL -o /usr/local/bin/mc \
    https://dl.min.io/client/mc/release/linux-amd64/mc
  chmod +x /usr/local/bin/mc
fi

mc alias set local "$ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb -p "local/${BUCKET}" 2>/dev/null || true

do_backup() {
  STAMP=$(date -u +%Y%m%dT%H%M%SZ)
  FILE="postgres-${PGDATABASE}-${STAMP}.sql.gz"
  TMP="/tmp/${FILE}"
  echo "[backup] dump ${PGDATABASE}@${PGHOST} → ${FILE}"
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
    --no-owner --no-acl \
    | gzip -9 > "$TMP"
  mc cp "$TMP" "local/${BUCKET}/${FILE}"
  rm -f "$TMP"
  echo "[backup] uploaded s3://${BUCKET}/${FILE}"

  # Rétention approximative : garde les N derniers dumps (RETENTION_DAYS ≈ nb fichiers)
  KEEP="$RETENTION_DAYS"
  LIST=$(mc ls "local/${BUCKET}/" | awk '{print $NF}' | grep '^postgres-.*\.sql\.gz$' | sort - || true)
  i=0
  echo "$LIST" | while read -r name; do
    [ -z "$name" ] && continue
    i=$((i + 1))
    if [ "$i" -gt "$KEEP" ]; then
      echo "[backup] purge $name"
      mc rm "local/${BUCKET}/${name}" || true
    fi
  done
}

echo "[backup] loop every ${INTERVAL}s (keep last ${RETENTION_DAYS} dumps)"
sleep 45
while true; do
  do_backup || echo "[backup] FAILED at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  sleep "$INTERVAL"
done
