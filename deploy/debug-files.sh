#!/bin/bash
echo "=== curl files ==="
curl -sI -m 10 https://files.global-it-ss.com 2>&1 | head -20
echo "=== minio container ==="
docker ps -a --filter name=invoicepilot-minio --format '{{.Names}} {{.Status}} {{.Ports}}'
echo "=== minio networks ==="
docker inspect invoicepilot-minio --format '{{json .NetworkSettings.Networks}}' | head -c 800
echo
echo "=== minio labels ==="
docker inspect invoicepilot-minio --format '{{json .Config.Labels}}' | tr ',' '\n' | grep -i traefik
echo "=== traefik routers invoice/files ==="
docker exec traefik-mvbo-traefik-1 wget -qO- http://127.0.0.1:8080/api/http/routers 2>/dev/null \
  | python3 -c '
import sys,json
d=json.load(sys.stdin)
for r in d:
  name=r.get("name","")
  rule=r.get("rule","")
  if "invoice" in name.lower() or "files" in name.lower() or "files.global" in rule:
    print(name, "|", r.get("status"), "|", rule, "|", r.get("error"))
'
echo "=== traefik services ==="
docker exec traefik-mvbo-traefik-1 wget -qO- http://127.0.0.1:8080/api/http/services 2>/dev/null \
  | python3 -c '
import sys,json
d=json.load(sys.stdin)
for s in d:
  name=s.get("name","")
  if "invoice" in name.lower() or "files" in name.lower():
    print(name, s.get("status"), s.get("serverStatus"))
'
echo "=== minio init logs ==="
docker logs invoicepilot-minio-init 2>&1 | tail -15
