#!/bin/bash
echo "=== containers (invoice|ollama|pilot) ==="
docker ps -a --format '{{.Names}}' | grep -iE 'invoice|pilot|ollama' || echo "(aucun)"
echo
echo "=== images ==="
docker images --format '{{.Repository}}:{{.Tag}}' | grep -iE 'invoice|pilot' || echo "(aucune)"
echo
echo "=== volumes ==="
docker volume ls -q | grep -iE 'invoice|pilot' || echo "(aucun)"
echo
echo "=== networks ==="
docker network ls --format '{{.Name}}' | grep -iE 'invoice|pilot' || echo "(aucun)"
echo
echo "=== /opt ==="
ls /opt 2>/dev/null
echo
echo "=== traefik routers leftover? ==="
docker exec traefik-mvbo-traefik-1 wget -qO- http://127.0.0.1:8080/api/http/routers 2>/dev/null \
  | python3 -c '
import sys,json
try:
  d=json.load(sys.stdin)
except Exception as e:
  print("api unavailable", e); sys.exit(0)
for r in d:
  name=r.get("name","")
  rule=r.get("rule","")
  if "invoice" in name.lower() or "files.global" in rule or "app.global-it-ss" in rule or "api.global-it-ss" in rule:
    print(name, "|", rule)
' || echo "(pas de router invoice)"
echo "DONE"
