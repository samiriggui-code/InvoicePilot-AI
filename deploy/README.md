# Déploiement VPS Hostinger — InvoicePilot AI (staging / test LLM)

**Objectif actuel :** déployer sur le VPS pour **tester Ollama + extraction IA** (heuristique + `qwen2.5:3b`).  
Pas encore de domaine prod final — FQDN de test : `*.global-it-ss.com`.  
Stripe reste en **mode test**. SMTP Hostinger branché pour les mails (contact, reset, invites).

Stack Docker sur `/opt/invoicepilot`, derrière **Traefik** (réseau externe `gsms`).

| Service | Rôle |
|---------|------|
| `app` | TanStack Start / Nitro `:3010` |
| `postgres` | PostgreSQL 16 |
| `redis` | Cache / future queue |
| `minio` | Storage + backups (`files.global-it-ss.com`) |
| `ollama` | LLM local `qwen2.5:3b` (analyse IA) |
| `worker` | Surveillance `PipelineJob` PENDING / stale |
| `db-backup` | `pg_dump` → MinIO bucket `invoicepilot-backups` (24h) |

## FQDN de test (DNS → VPS)

- `https://app.global-it-ss.com` — application
- `https://api.global-it-ss.com` — même app (API)
- `https://global-it-ss.com` / `www` — marketing + app
- `https://files.global-it-ss.com` — console MinIO

## Prérequis VPS

1. Docker + Compose plugin
2. Traefik déjà up avec réseau `docker network ls | grep gsms`
3. DNS A/AAAA des FQDN ci-dessus vers le VPS
4. Ports 80/443 ouverts

## Premier déploiement

Depuis ta machine (PowerShell / Git Bash), adapte l’hôte SSH :

```bash
# 1. Sync code (exclure node_modules / .output)
rsync -avz --delete \
  --exclude node_modules --exclude .output --exclude .git --exclude .data \
  ./ user@VPS_IP:/opt/invoicepilot/

# 2. Secrets (fichier local gitignoré deploy/.env)
scp deploy/.env user@VPS_IP:/opt/invoicepilot/.env
```

Sur le VPS :

```bash
cd /opt/invoicepilot
chmod +x deploy/*.sh
bash deploy/first-deploy.sh
```

**Premier pull Ollama** (`qwen2.5:3b`) : plusieurs minutes. Vérifier :

```bash
docker logs -f invoicepilot-ollama-init
docker exec invoicepilot-ollama ollama list
```

Puis dans l’app : **Agent / sources** → importer une facture → extraction LLM.

## Secrets

`deploy/.env` (non commité) : Stripe **test**, SMTP Hostinger, Ollama activé.  
Rien à changer pour ce staging.

## Stripe webhook (mode test)

`https://app.global-it-ss.com/api/stripe/webhook`

## LLM — checklist de test

1. `invoicepilot-ollama` up + modèle listé  
2. App : `LLM_EXTRACT_ENABLED=true` + `OLLAMA_BASE_URL=http://invoicepilot-ollama:11434`  
3. Analyser une facture via l’UI  
4. Si Ollama down → fallback heuristique (pas de blocage)

```bash
docker compose logs -f app | grep -i ollama
```

## Utiliser Ollama du VPS depuis le local

Quand tu veux garder l'app en local mais utiliser le LLM du VPS :

1. Exposer Ollama sur le VPS en localhost seulement :

```yaml
ollama:
  ports:
    - "127.0.0.1:11434:11434"
```

2. Redémarrer le service sur le VPS :

```bash
cd /opt/invoicepilot
docker compose up -d ollama
```

3. Ouvrir le tunnel SSH depuis ta machine :

```bash
npm run tunnel:ollama
```

4. Mettre ces variables dans le `.env` local :

```env
LLM_EXTRACT_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
```

5. Redémarrer `npm run dev`, puis vérifier le badge `IA · Up` sur la page Analyse IA / Agent.

Notes :
- le worker actuel ne lance pas encore les extractions LLM ; il surveille surtout les `PipelineJob`
- Redis est provisionné pour plus tard, mais n'est pas encore utilisé par le code applicatif
- pour tester l'IA locale, il suffit donc surtout du tunnel Ollama

## Commandes utiles

```bash
cd /opt/invoicepilot
docker compose ps
bash deploy/show-access.sh
docker compose up -d --build app worker
```

Domaine prod final + Stripe live : plus tard, quand le produit sera prêt.
