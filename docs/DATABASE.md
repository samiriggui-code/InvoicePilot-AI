# Base de données PostgreSQL — InvoicePilot AI (SaaS multi-tenant)

## Modèle SaaS en 30 secondes

```
User ──< OrganizationMember >── Organization ── Subscription (Stripe)
                                      │
                                      ├── BridgeProfile (onboarding sources + PA + plan)
                                      ├── Counterparties (clients/fournisseurs)
                                      ├── Invoices + lines + validations + lifecycle
                                      ├── Platform connections (PA choisie)
                                      ├── Merchant integrations (sources)
                                      ├── StorageObject (artefacts par org)
                                      ├── PipelineJob (centre de tri)
                                      └── API keys / webhooks
```

| Concept | Table | Rôle |
|---------|-------|------|
| **Compte login** | `users` | Email + mot de passe (scrypt) |
| **Tenant** | `organizations` | L’entreprise cliente du SaaS (SIREN, TVA…) |
| **Pont / onboarding** | `organization_bridge_profiles` | Sources, PA préférée, volume, plan |
| **Centre de tri** | `storage_objects`, `pipeline_jobs` | Brut → canonical → Factur-X → PA in/out |
| **Lien multi-user** | `organization_members` | Un user peut appartenir à 1+ orgs |
| **Abonnement** | `subscriptions` | 1 plan Stripe **par organisation** |

**Règle d’or :** les données métier sont toujours rattachées à `organizationId`.

Voir aussi : `docs/ARCHITECTURE_PONT.md` et `src/api/README.md`.

### Stockage (clés)

`org/{organizationId}/sources/...` · `.../invoices/{id}/...` · `.../pa/outbox|inbox/...`

### Flux inscription

1. User + org + diagnostic réforme  
2. `bridge_profile` (sources, PA, volume, plan)  
3. Connexion PA pré-sélectionnée si slug trouvé dans `approved_platforms`  
4. Essai → redirection **Sources** (`/integrations`)  

### Comptes de test (seed)

```bash
npm run db:seed
```

**Mot de passe :** `Test1234!` — `owner@dupont.fr`, etc.

## Schéma (`prisma/schema.prisma`)

| Domaine | Tables |
|---------|--------|
| Auth | `users`, `auth_sessions`, … |
| Multi-tenant | `organizations`, `organization_members`, `organization_bridge_profiles` |
| Facturation | `invoices`, `invoice_lines`, `invoice_validations`, … |
| PA | `approved_platforms`, `organization_platform_connections`, `invoice_lifecycle_events` |
| Sources | `merchant_integrations` |
| Centre de tri | `storage_objects`, `pipeline_jobs` |
| Archive | `invoice_archive_artifacts` |
| API | `api_keys`, `webhook_endpoints` |

## Commandes

```bash
npm run db:generate
npm run db:push
npm run db:seed
```
