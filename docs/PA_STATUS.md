# Statuts PA — modèle InvoicePilot

Références : cycle de vie DGFiP (14 statuts), APIs PA partenaires (WeInvoice Connect, IOPOLE, réforme 2026).

## Statuts réseau (`PaTransmissionStatus`)

| Statut interne | Signification | Équivalent DGFiP / partenaires |
|----------------|---------------|--------------------------------|
| `QUEUED` | En file avant dépôt | — |
| `SUBMITTED_TO_PA` | Dépôt reçu par la PA | Déposé / DEPOSITED |
| `ACCEPTED_BY_PA` | Contrôles PA OK | Accepté / ACCEPTED |
| `DELIVERED_TO_BUYER_PA` | Disponible réseau public | Mise à disposition / AVAILABLE |
| `RECEIVED` | Reçu (réception fournisseur) | Reçu / RECEIVED |
| `REFUSED` | Refus métier acheteur | Refusé |
| `REJECTED` | Rejet technique / conformité | Rejeté |
| `TECHNICAL_ERROR` | Incident PA | ERROR |

Champs persistés :
- `pa_status`, `pa_status_code`, `pa_status_message`, `pa_reference`, `last_pa_status_at`

## Émission facture B2B

1. `QUEUED` → dépôt connecteur (`PaConnector.submit`)
2. Progression sandbox / webhook : `SUBMITTED_TO_PA` → `ACCEPTED_BY_PA` → `DELIVERED_TO_BUYER_PA`
3. Notifications in-app (`category: PA`) à chaque transition
4. Webhook entrant : `POST /api/v1/webhooks/pa/:slug`

## E-reporting

Même enum sur `EReportingEntry`. Transmission via PA (lot B2C / export / intra-UE) :
`SUBMITTED_TO_PA` → `ACCEPTED_BY_PA` + `transmittedAt`.

## Réception

`PaInboxDocument` : document structuré + PDF + métadonnées + message PA.
Import → facture `PURCHASE` `RECEIVED`.

## Prochaines intégrations partenaires

- WeInvoice Connect : OpenAPI `api.weinvoice.fr/documentation/` — webhooks + 4 statuts DGFiP
- Seqino / B2Brouter / Qonto : mapper `mapWebhook` vers `PaTransmissionStatus`
- AFNOR XP Z12-013 : API normalisée connexion PA
