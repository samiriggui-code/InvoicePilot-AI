# Connexions réelles — Sources & PA

**Figé :** 17 juillet 2026

## Vérité PA

InvoicePilot est une **Solution Compatible**, pas une Plateforme Agréée.

Les ~100+ PA DGFiP **n’exposent pas une API unique**. Pour qu’un logiciel comme le nôtre émette / reçoive :

| Modèle | Exemple | Ce que fait le client | Ce que fait InvoicePilot |
|--------|---------|----------------------|--------------------------|
| **Marque grise / API partenaire** | Seqino, B2Brouter, Iopole… | Compte chez la PA partenaire (ou onboarding via nous) | Clés API / OAuth → `PaConnector.submit` / inbox / webhooks |
| **API B2G officielle** | Chorus Pro | Raccordement SI → Portail de services | Connecteur dédié |
| **PA du client seule** | Pennylane, Qonto, Indy… | A déjà sa PA | On **déclare** laquelle — on ne prétend pas appeler leur API e-invoicing |

Sources publiques :
- [Seqino API marque grise](https://seqino.com/api-pdp-marque-blanche-grise-facture-electronique/)
- [B2Brouter Solution Compatible](https://www.b2brouter.net/fr/edocsync-pdp/)
- [Liste PA DGFiP](https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees)
- [API Chorus Pro](https://www.data.gouv.fr/dataservices/api-chorus-pro)

### Interdit UX

- Bouton « Connecter » sur n’importe quelle PA du catalogue sans credentials
- Afficher « Active / sync » alors que `credentialsRef = demo-sandbox` pour Pennylane/Qonto

### Autorisé UX

1. **Activer sandbox InvoicePilot** — simulation locale
2. **Configurer API partenaire** — clé API (hashée) pour Seqino / B2Brouter / Chorus
3. **Déclarer ma PA** — choix client (guidance), sans canal technique

---

## Vérité Sources

| Source | Auth réelle | Pas ça |
|--------|-------------|--------|
| **Shopify** | Domaine boutique + Admin API access token (custom app) ou OAuth app | « Connecter démo » sans domaine |
| **WooCommerce** | URL boutique + Consumer Key + Consumer Secret (REST) | Bouton magique sans credentials |
| **Saisie / PDF** | Upload 1–10 PDF → factures `manual_upload` (brouillon à enrichir) | OCR magique sans revue |

**Actualiser** = pull API live (Shopify orders / Woo orders) ou jeu sandbox si compte démo.  
Les sources choisies à l’inscription sont **rectifiables** sur `/integrations`.

Sandbox = action **explicite** « Données démo », séparée de la vraie connexion.

**Filet de secours :** `MANUAL_UPLOAD` (Saisie / PDF) est **toujours** au catalogue et
connecté — non retirable. Si Shopify / Woo / site ne se connecte pas, le commerçant
charge ses PDF sans bloquer le flux.
