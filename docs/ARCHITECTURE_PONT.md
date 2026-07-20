# Architecture « pont » — InvoicePilot AI

**Figé le :** 17 juillet 2026  
**Positionnement :** solution compatible (pas une PA). Pont entre **sources clients** (CMS/CRM/ERP) et **plateformes agréées DGFiP**.

---

## 1. Promesse

```
Sources (Shopify, Woo, Wix, API, upload…)
        │
        ▼
  InvoicePilot — centre de tri
  1. Ingest + stockage brut (par org)
  2. Normaliser → CanonicalInvoice
  3. Analyser → corriger
  4. Render Factur-X / UBL / CII
  5. Outbox → PA (émission)
  6. Inbox ← PA (réception)
  7. Webhooks → app cliente
        │
        ▼
  PA immatriculée (réseau + DGFiP)
```

Les apps sources **ne parlent jamais** directement à une PA.  
Les adaptateurs PA **ne parlent jamais** le format Shopify.

---

## 2. Contrats stables

| Contrat | Rôle |
|---------|------|
| `CanonicalInvoice` | Format interne unique (FR 2026) |
| `SourceConnector` | pull / webhook → CanonicalInvoice + raw blob |
| `PaConnector` | submit / fetchInbox / mapWebhook |
| `StorageKey` | chemin objet par `organizationId` + kind |
| `PipelineJob` | étape du centre de tri (audit + reprise) |

Code : `src/api/` (voir README dans ce dossier).

---

## 3. Structure API (éviter l’usine)

```
src/api/
  canonical/     # types CanonicalInvoice
  storage/       # clés + persistance artefacts
  connectors/
    sources/     # shopify, woo, http, upload…
    pa/          # sandbox, puis partenaires
  pipeline/      # ingest → validate → remediate → render → submit
  http/          # routes publiques /v1/* (à brancher)
```

**Règle N+M :** N sources + M PA, pas N×M.  
On démarre : **1 source (Shopify)** + **1 PA (sandbox → 1 partenaire)**.

### Endpoints publics cibles (`/v1`)

| Méthode | Path | Étape |
|---------|------|-------|
| POST | `/invoices/import` | ingest JSON canonique |
| POST | `/invoices/validate` | analyse |
| POST | `/invoices/remediate` | correction |
| POST | `/invoices/render` | Factur-X |
| POST | `/invoices/submit` | dépôt PA |
| GET | `/inbox` | réception |
| POST | `/webhooks/pa/:slug` | PA → nous |
| POST | `/webhooks/out` | nous → app cliente |

---

## 4. Stockage persistant (par organisation)

Préfixe objet : `org/{organizationId}/…`

| Kind | Chemin typique | Contenu |
|------|----------------|---------|
| `SOURCE_RAW` | `…/sources/{provider}/{externalId}/raw.json` | payload CMS brut |
| `CANONICAL_JSON` | `…/invoices/{invoiceId}/canonical.json` | CanonicalInvoice |
| `FACTURX_XML` | `…/invoices/{invoiceId}/factur-x.xml` | XML |
| `FACTURX_PDF` | `…/invoices/{invoiceId}/factur-x.pdf` | PDF/A-3 (à venir) |
| `PA_SUBMIT` | `…/pa/outbox/{invoiceId}/{ts}.json` | payload envoyé |
| `PA_RESPONSE` | `…/pa/outbox/{invoiceId}/{ts}-resp.json` | ack / rejet |
| `INBOUND_RAW` | `…/pa/inbox/{paRef}/raw` | facture fournisseur |

Tables : `storage_objects`, `pipeline_jobs` (+ factures / archives existantes).

---

## 5. Parcours produit (ordre UI)

1. **Sources** — brancher où vivent les factures  
2. **Ma PA** — choisir / se faire guider (liste DGFiP)  
3. **Émission** — analyser → corriger → rendre → transmettre  
4. **Réception** — inbox fournisseurs  
5. **E-reporting** — hors e-invoicing  
6. Pilotage — dashboard, clients, conformité, IA  

Inscription / paiement : qualifier sources + PA + volume + plan **avant** (ou pendant) le checkout Stripe.

---

## 6. Onboarding PA

Voir aussi `docs/CONNEXIONS.md`.

1. « J’ai déjà une PA » → **déclaration** (guidance) si pas d’API partenaire  
2. Canal technique : **sandbox** InvoicePilot **ou** clé API partenaire (Seqino / B2Brouter / Chorus)  
3. Interdit : bouton « Connecter » sur tout le catalogue DGFiP sans credentials  
4. N×M évité : 1–2 partenaires API d’abord, pas 138 connecteurs

---

## 7. Ce que renvoie une PA (contrat cible)

```ts
PaSubmitResult { ok, paReference, errors[] }
PaLifecycleEvent { status, occurredAt, raw }
PaInboundInvoice { supplier, amounts, xml|pdf, paReference }
```

Chaque adaptateur PA mappe son JSON propriétaire vers ces types.
