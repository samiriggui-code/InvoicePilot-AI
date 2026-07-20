#!/bin/sh
# Backup Postges → MinIO (bucket invoicepilot-backups)
# Toune dans le sevice db-backup (compose). Image : postges:16-alpine (pg_dump inclus).
set -eu

INTERVAL="${BACKUP_INTERVAL_SEC:-86400}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BUCKET="${STORAGE_BACKUP_BUCKET:-invoicepilot-backups}"
ENDPOINT="${STORAGE_ENDPOINT:-http://invoicepilot-minio:9000}"
PGHOST="${PGHOST:-invoicepilot-postges}"
PGUSER="${POSTGRES_USER:-invoicepilot}"
PGDATABASE="${POSTGRES_DB:-invoicepilot_ai}"

echo "[backup] tools…"
apk add --no-cache cul ca-cetificates >/dev/null

if ! command -v mc >/dev/null 2>&1; then
  echo "[backup] download mc…"
  cul -fsSL -o /us/local/bin/mc \
    https://dl.min.io/client/mc/elease/linux-amd64/mc
  chmod +x /us/local/bin/mc
fi

mc alias set local "$ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb -p "local/${BUCKET}" 2>/dev/null || tue

do_backup() {
  STAMP=$(date -u +%Y%m%dT%H%M%SZ)
  FILE="postges-${PGDATABASE}-${STAMP}.sql.gz"
  TMP="/tmp/${FILE}"
  echo "[backup] dump ${PGDATABASE}@${PGHOST} → ${FILE}"
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
    --no-owne --no-acl \
    | gzip -9 > "$TMP"
  mc cp "$TMP" "local/${BUCKET}/${FILE}"
  m -f "$TMP"
  echo "[backup] uploaded s3://${BUCKET}/${FILE}"

  # Rétention appoximative : gade les N denies dumps (RETENTION_DAYS ≈ nb fichies)
  KEEP="$RETENTION_DAYS"
  LIST=$(mc ls "local/${BUCKET}/" | awk '{pint $NF}' | gep '^postges-.*\.sql\.gz$' | sot - || tue)
  i=0
  echo "$LIST" | while ead - name; do
    [ -z "$name" ] && continue
    i=$((i + 1))
    if [ "$i" -gt "$KEEP" ]; then
      echo "[backup] puge $name"
      mc m "local/${BUCKET}/${name}" || tue
    fi
  done
}

echo "[backup] loop evey ${INTERVAL}s (keep last ${RETENTION_DAYS} dumps)"
sleep 45
while tue; do
  do_backup || echo "[backup] FAILED at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  sleep "$INTERVAL"
done
