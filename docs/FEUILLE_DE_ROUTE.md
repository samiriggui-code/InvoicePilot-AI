# Feuille de route — InvoicePilot AI

**Version :** 1.0 — 17 juillet 2026  
**Horizon :** aujourd’hui → septembre 2027 (fenêtre marché)  
**Aligné sur :** `docs/CAHIER_DES_CHARGES.md` + `docs/ARCHITECTURE_PONT.md`  
**Positionnement :** solution compatible — **pont** sources ↔ PA. **Pas une PA. Pas un ERP.**

### Boucle produit (figée)

```
Sources → Ingest/Storage → Validate → Remediate → Render → Submit PA → Lifecycle
                                                              ↑
Réception PA (inbox) ─────────────────────────────────────────┘
```

Code API : `src/api/` (canonical, storage, connectors, pipeline).

---

## 2. Offre commerciale (rappel)

| Canal | Produit | Prix indicatif |
|--------|---------|----------------|
| PME / indépendants | SaaS Starter / Pro / Enterprise | 29 € → 199 € / mois |
| Éditeurs logiciels | Licences API (validate, remediate, render, webhooks) | Sandbox gratuite → volume sur devis |
| Cabinets comptables | Multi-dossiers, corrections en masse, reporting | Dégressif dès ~10 dossiers |

---

## 3. État des lieux (juillet 2026)

| Brique | Statut | Commentaire |
|--------|--------|-------------|
| Diagnostic réforme / inscription 2026 | ✅ | Module A |
| Contrôles bloquants mentions 2026 | ✅ partiel | `validateInvoiceDraft` + Analyse IA |
| Dashboard conformité | ✅ | Score, échéances, PA |
| Assistant juridique (FAQ réglementaire) | ✅ | FAB — distinct de l’analyse document |
| Analyse document (facture → checks) | ✅ v1 | Pas encore « corriger / régénérer » |
| API sandbox validate / score / webhooks | ✅ | Mintlify `apps/docs` |
| Connexion PA | 🟡 sandbox UI | Pas de credentials production |
| Génération Factur-X conforme | ❌ | Priorité absolue |
| Écran « bloquée → corriger » | ❌ | Priorité absolue |
| Archive documentaire | ❌ | |
| Connecteur marchand bout-en-bout | ❌ | 1 seul d’abord (Shopify ou Odoo) |
| Licences API volume / SLA | ❌ | Packaging + billing |
| Offre cabinets multi-dossiers | 🟡 pages | Produit incomplet |

---

## 4. Phases

### Phase 0 — Socle déjà là (fait)
**Objectif :** ne plus perdre de temps sur le cosmétique.

- Landing + pages marketing + docs Mintlify  
- Auth, orga, factures, clients, conformité, dashboard  
- Analyse IA document v1 + assistant juridique  
- API sandbox  

**Critère de sortie :** équipe alignée sur la boucle « contrôler → corriger → émettre ».

---

### Phase 1 — De « bloqué » à « conforme » (4–6 semaines)
**Objectif :** le client a une raison de payer après un contrôle rouge.

| Livrable | Description | Priorité |
|----------|-------------|----------|
| P1.1 Écran facture bloquée | Liste des erreurs + actions concrètes par code (SIREN, catégorie, livraison, lignes…) | P0 |
| P1.2 Correction assistée | Formulaires / suggestions « Appliquer » (compléter SIREN, catégorie, adresse) | P0 |
| P1.3 Enrichissement client | Fiche client : SIREN obligatoire, aide saisie ; lien depuis le blocage | P0 |
| P1.4 Régénération document | Générer un **Factur-X** (PDF/A-3 + XML) à partir des données corrigées — template FR 2026 | P0 |
| P1.5 Archive v1 | Stocker original + version corrigée + journal des contrôles | P1 |
| P1.6 Statuts UI | `DRAFT` → `BLOCKED` → `READY` → `ARCHIVED` (avant PA réelle) | P1 |

**Critère de sortie :** une facture bloquée peut être corrigée puis téléchargée en Factur-X conforme (sans PA encore).

**API associée :**
- `POST /invoices/validate` (existe)
- `POST /invoices/remediate` (suggestions + patch)
- `POST /invoices/render` (Factur-X)

---

### Phase 2 — Brancher le réseau PA (4–6 semaines)
**Objectif :** « on le fait partir » — sans devenir PA.

| Livrable | Description | Priorité |
|----------|-------------|----------|
| P2.1 1 PA partenaire sandbox → prod | Credentials, mapping émission / réception, statuts | P0 |
| P2.2 Flux émission | READY → TRANSMITTING → TRANSMITTED / REJECTED | P0 |
| P2.3 Gestion des rejets PA | Afficher motif → corriger → renvoyer | P0 |
| P2.4 Réception basique | Inbox factures entrantes via PA (au minimum liste + PDF/XML) | P1 |
| P2.5 Dashboard cycle de vie | Statuts horodatés visibles (promesse réforme) | P1 |

**Critère de sortie :** une facture corrigée part en sandbox PA et remonte un statut.

---

### Phase 3 — 1 connecteur bout-en-bout (4–6 semaines)
**Objectif :** prouver l’intégration « logiciels existants », pas 10 logos.

**Choix recommandé :** **Shopify** *ou* **Odoo** (un seul d’abord).

| Livrable | Description | Priorité |
|----------|-------------|----------|
| P3.1 Import commandes / factures | Sync → normalisation InvoicePilot | P0 |
| P3.2 Pipeline complet | Import → validate → remediate → render → (PA) | P0 |
| P3.3 Mapping champs | SIREN, TVA, lignes, client | P0 |
| P3.4 Webhooks connecteur | Événements `imported` / `blocked` / `ready` / `emitted` | P1 |
| P3.5 Page connecteur « live » | Plus un catalogue mort : état sync + erreurs | P1 |

**Ensuite seulement :** WooCommerce, Stripe, Dolibarr, Sage (même pattern).

**Critère de sortie :** une commande source devient une Factur-X prête PA sans ressaisie.

---

### Phase 4 — Canaux B2B (en parallèle dès Phase 1 fin)
**Objectif :** licences API + cabinets = scale.

| Livrable | Description | Priorité |
|----------|-------------|----------|
| P4.1 API production | Clés, quotas, billing volume, OpenAPI stable | P0 |
| P4.2 Endpoints remediate / render | Différenciation vs « validate-only » | P0 |
| P4.3 Offre cabinets | Multi-org, rôles collab, reporting blocages, corrections en masse | P0 |
| P4.4 Packing Stripe | Starter / Pro / Enterprise alignés sur P1–P3 | P1 |
| P4.5 SLA / DPA éditeurs & cabinets | Contrat + page statut prod | P1 |

---

### Phase 5 — Extension (post-MVP marché)
- E-reporting B2C / export  
- 2ᵉ et 3ᵉ connecteurs  
- Multi-PA avancé  
- Templates sectoriels  
- Tolérance 2026 / alertes calendrier PME 2027  

---

## 5. Priorisation stricte (ne pas diluer)

### Faire maintenant
1. Écran **bloquée → corriger**  
2. **Génération Factur-X**  
3. **Archive** minimale  
4. **1 PA** réelle (sandbox puis prod)  
5. **1 connecteur** bout-en-bout  

### Ne pas faire (pour l’instant)
- Multiplier les pages marketing  
- 8 connecteurs « logo only »  
- Refonte cosmétique sans flux métier  
- Confondre FAQ juridique et analyse document  

---

## 6. Jalons calendaires (indicatif)

| Jalon | Date cible | Preuve |
|-------|------------|--------|
| **M1** — Corriger + Factur-X | fin août 2026 | Démo : bloquée → conforme téléchargeable |
| **M2** — 1 PA branchée | fin septembre 2026 | Démo émission + statut |
| **M3** — 1 connecteur live | fin octobre 2026 | Shopify ou Odoo → Factur-X → PA |
| **M4** — API + cabinets v1 | fin novembre 2026 | 1 éditeur / 1 cabinet en pilote |
| **M5** — Durcissement PME 2027 | H1 2027 | Scale connecteurs + e-reporting |

> La réception obligatoire est au **01/09/2026** ; l’émission PME au **01/09/2027**. La fenêtre commerciale se ferme surtout sur le choix de stack des entreprises d’ici 2027.

---

## 7. Métriques de succès

| Métrique | Cible Phase 1–2 |
|----------|-----------------|
| % factures bloquées **résolues** sous 7 j | > 60 % |
| Temps moyen bloquée → READY | < 15 min (parcours guidé) |
| Factur-X générés / mois | croissance MoM |
| Appels API `validate` + `render` | adoption éditeurs |
| Orgs avec PA connectée | > 50 % des payants Pro |

---

## 8. Découpage équipes / chantiers

| Chantier | Contenu |
|----------|---------|
| **Core conformité** | Codes erreur, remediate UI, Factur-X, archive |
| **Réseau** | PA, statuts, rejets |
| **Intégrations** | 1 connecteur + webhooks |
| **Plateforme** | API keys, billing, multi-tenant cabinets |
| **Go-to-market** | 1 vertical (e-commerce ou ERP) + 1 cabinet pilote |

---

## 9. Risques

| Risque | Mitigation |
|--------|------------|
| Rester « outil de score » | Phase 1 avant tout le reste |
| Trop de connecteurs trop tôt | Un seul, bout-en-bout |
| Confusion juridique (se faire passer pour PA) | Mentions SC systématiques ; transmission = PA |
| Complexité Factur-X | Lib éprouvée + tests EN 16931 ; scope FR d’abord |
| Fenêtre 2027 | Pilotes payants dès M2–M3 |

---

## 10. Prochaine action concrète

**Sprint immédiat (2 semaines) :**

1. Modèle statuts `BLOCKED` / `READY`  
2. UI facture : liste des blocages + formulaires de correction  
3. POC génération Factur-X (1 template FR 2026)  
4. Lien Analyse IA → même moteur de correction  

Ensuite seulement : PA + connecteur.

---

*Document vivant — à mettre à jour à chaque fin de phase. Toute feature hors feuille de route doit justifier qu’elle accélère la boucle « contrôler → corriger → émettre ».*
