# Cahier des charges — InvoicePilot AI

**Version :** 1.1 — 18 juillet 2026 (ajout §1.6 sanctions LF 2026, §1.7 synthèse guide de démarrage DGFiP, annexe A connecteurs API PA)
**Produit :** InvoicePilot AI — SaaS d'accompagnement et de mise en conformité à la facturation électronique française
**Sources réglementaires :** economie.gouv.fr, impots.gouv.fr (analyse du 17/07/2026)

---

## 1. Contexte et enjeu

La réforme de la facturation électronique entre entreprises (B2B domestique) entre en vigueur le **1er septembre 2026**. Plus de **10 millions d'acteurs économiques** sont concernés. Les factures « papier », PDF ordinaires ou envoyées par e-mail ne seront **plus conformes** : toute facture B2B devra être un document **structuré et normé**, transmis via une **plateforme agréée (PA)** immatriculée par l'État.

### 1.1 Calendrier légal (loi de finances 2024, art. 91)

| Échéance | Obligation |
|---|---|
| **1er septembre 2026** | **Toutes les entreprises** (quelle que soit la taille) doivent pouvoir **recevoir** des factures électroniques et avoir choisi une plateforme agréée |
| **1er septembre 2026** | Les **grandes entreprises et ETI** doivent **émettre** 100 % de leurs factures au format électronique et transmettre leurs données de **e-reporting** |
| **1er septembre 2027** | Les **PME et micro-entreprises** (y compris auto-entrepreneurs) doivent **émettre** électroniquement et transmettre leur e-reporting |

> L'administration a annoncé une « approche de tolérance et de bienveillance » au démarrage (sept. 2026), mais l'obligation demeure.

### 1.2 Les trois volets de la réforme

1. **E-invoicing** : émission/réception de factures électroniques entre entreprises **établies en France et assujetties à la TVA** (y compris franchise en base, micro-entrepreneurs, professions libérales). Les données de facture sont transmises automatiquement à l'administration par la plateforme.
2. **E-reporting de transaction** : transmission à l'administration des données de ventes vers des **non-assujettis** (particuliers/B2C) ou des **opérateurs étrangers** (export, intracommunautaire).
3. **E-reporting de paiement** : transmission des **données d'encaissement** pour les opérations dont la TVA est exigible à l'encaissement (prestations de services sans option TVA sur les débits).

### 1.3 Qui est concerné

- **Toutes** les entreprises assujetties à la TVA établies en France : toute taille, toute forme juridique, tout régime d'imposition.
- Les entreprises en **franchise en base de TVA** (micro-entrepreneurs) : assujetties donc **concernées**, en réception ET en émission.
- Même une entreprise qui n'émet aucune facture doit pouvoir **recevoir** (fournisseurs d'énergie, télécom…).
- **Hors périmètre e-invoicing** : opérations exonérées de TVA ; clients particuliers et étrangers (→ bascule en e-reporting).

### 1.4 Qu'est-ce qu'une facture électronique conforme

- Format normé : **UBL**, **CII**, ou format mixte (**Factur-X** : données structurées + lisible PDF/A-3).
- Mentions obligatoires dans des **champs structurés dédiés**.
- Transmission obligatoire **via une plateforme agréée** — jamais en direct de fournisseur à client.
- Cycle de vie horodaté avec **statuts de traitement** (déposée, reçue, refusée, encaissée…) visibles par les deux parties.

### 1.5 Écosystème

- **Plateforme agréée (PA / ex-PDP)** : opérateur privé immatriculé par la DGFiP pour **3 ans renouvelables** (conformité fiscale, sécurité, interopérabilité avec le Portail Public de Facturation et les autres PA). Seul canal habilité. Liste officielle publiée et mise à jour sur impots.gouv.fr. Modèles tarifaires constatés : prix à la facture (~0,10 € à 1 €), forfait mensuel, ou coût intégré à une offre logicielle.
- **Liberté de choix des plateformes** : une entreprise peut désigner **une ou plusieurs PA** — une seule pour tous ses flux, une pour les achats et une pour les ventes, ou une par SIRET/logiciel de facturation. La PA choisie peut être différente de celle du client ou du fournisseur (interopérabilité obligatoire entre PA).
- **PPF (Portail Public de Facturation)** : ⚠️ contrairement au schéma initial de la réforme (abandonné fin 2024), le PPF **n'offre pas de service gratuit d'échange de factures**. Il est recentré sur deux rôles : l'**annuaire** des assujettis et le **concentrateur de données** vers la DGFiP. Le passage par une PA privée est donc obligatoire pour toutes les entreprises.
- **Solution compatible** : logiciel (facturation, caisse, compta, ERP) **non immatriculé** qui doit obligatoirement s'appuyer sur une PA pour transmettre. **→ C'est le positionnement d'InvoicePilot AI.**
- **Annuaire de la facturation électronique** (facturation.chorus-pro.gouv.fr, ouvert sept. 2025) : recense les assujettis, leur PA de réception et leurs adresses électroniques de facturation. Consultation libre et gratuite par SIREN/SIRET, dénomination ou adresse. Adresses possibles à plusieurs mailles (SIREN, SIREN+suffixe, établissement).
- **Chorus Pro** : reste le canal des factures à destination du secteur public (B2G).
- **Assistance nationale** : 0 806 807 807.

### 1.6 Sanctions (montants revus à la hausse par la loi de finances 2026)

| Manquement | Amende | Plafond annuel | Base légale |
|---|---|---|---|
| Non-émission d'une facture au format électronique via PA | **50 € par facture** (initialement 15 €) | 15 000 € / an (assujetti) ; 45 000 € / an (plateforme) | CGI art. 1737, III et IV |
| Absence de recours à une PA pour la **réception** | **500 €** à l'expiration d'un délai de 3 mois après **mise en demeure**, puis **1 000 €** après chaque nouvelle période de 3 mois | — (amende récurrente) | CGI art. 1737, IV bis |
| Manquement au **e-reporting** (données de transaction/paiement) — assujetti | **500 € par transmission** | 15 000 € / an et par type de transmission | CGI art. 1788 D, I-II |
| Manquement au e-reporting — plateforme agréée | 750 € par transmission | 100 000 € / an et par type de transmission | CGI art. 1788 D, III-IV |
| Manquements d'une PA (dont non-actualisation de l'annuaire) | Retrait du numéro d'immatriculation | — | CGI art. 1788 E |

**Exonération** : pas d'amende s'il s'agit de la **première infraction** de l'année civile en cours et des trois années précédentes, **ou** si l'infraction est réparée spontanément ou dans les **30 jours** d'une première demande de l'administration.

> Opportunité produit : le score de conformité (Module E2) peut chiffrer le **risque financier** encouru par l'utilisateur (nb de factures non conformes × 50 €, e-reporting manquant × 500 €…).

### 1.7 Phase de démarrage — guide pratique DGFiP (juillet 2026)

Synthèse du « Guide pratique de démarrage au 1er septembre 2026 » (DGFiP, 29 questions) — source : impots.gouv.fr.

**Trois principes directeurs :**
1. **Maintien du calendrier légal** — aucune obligation n'est reportée ni suspendue (art. 289 bis CGI : émission, transmission et réception via plateforme agréée ; art. 289 E : la PA transmet les données à la DGFiP).
2. **Continuité économique** — une facture reçue par mail/PDF/papier après le 01/09/2026 reste valide : elle peut être traitée, payée, comptabilisée et la **TVA déduite** (art. 271 CGI). Elle ne doit pas être écartée au seul motif du canal.
3. **Pas une dispense** — le canal alternatif ne satisfait pas l'obligation : la même facture doit être **régularisée** par le circuit électronique « dans les meilleurs délais », sans créer de doublon.

**Tolérance conditionnée à une « trajectoire sérieuse de mise en conformité »** — pas de sanction automatique au démarrage si l'entreprise peut produire des éléments **concrets, datés et cohérents** : contrat/choix d'une PA, échanges avec éditeur/expert-comptable/prestataire, calendrier de raccordement, tests réalisés, tickets support, mesures transitoires, plan de régularisation. L'administration distinguera la difficulté réelle de l'« inertie, l'évitement ou le refus durable ».

**Règles opérationnelles à implémenter dans le produit :**
- **Rejet ≠ refus** : le *rejet* est technique (format, donnée manquante, routage — émis par une plateforme) ; le *refus* est un statut de cycle de vie posé par l'acheteur, **obligatoirement motivé** selon les motifs prévus par la norme (non-conformité réglementaire, facture mal adressée, non-respect de conditions contractuelles). Il ne doit pas servir aux litiges commerciaux.
- Une facture refusée puis réémise doit porter un **nouveau numéro** (sinon rejet pour réutilisation de numéro).
- **Anti-doublons** : désigner une facture de référence, marquer les autres exemplaires « duplicata » / « copie de continuité », piloter les envois complémentaires à partir des **statuts de cycle de vie** (n'envoyer un double que si les statuts montrent que la facture n'est pas parvenue). Jamais de double paiement / double comptabilisation / double déduction TVA.
- **Indisponibilité de l'annuaire** : les PA peuvent s'appuyer sur des copies locales de l'annuaire et sur les **adresses techniques Peppol** — prévoir un cache annuaire côté produit.
- **Traçabilité** : conserver pour chaque incident les messages d'erreur, horodatages, tickets, échanges — c'est la preuve de bonne foi attendue par l'administration (→ journal d'audit par facture dans InvoicePilot).
- **Émission volontaire anticipée** (PME/TPE dès 2026) : possible, mais obligatoirement via une PA, avec suivi des statuts et maîtrise des doubles envois. Un client ne peut **pas imposer** l'émission électronique à une PME avant son échéance du 01/09/2027.

---

## 2. Positionnement et objectifs du produit

**InvoicePilot AI n'est pas une plateforme agréée.** C'est une **solution compatible intelligente** qui aide les TPE/PME, indépendants et micro-entrepreneurs à :

1. **Comprendre** leurs obligations (agent IA réglementaire, diagnostic personnalisé) ;
2. **Produire** des factures conformes (mentions obligatoires, formats normés Factur-X/UBL/CII) ;
3. **Transmettre** via une ou plusieurs plateformes agréées partenaires (connecteurs API) ;
4. **Piloter** leur facturation (statuts temps réel, e-reporting, trésorerie, délais de paiement).

### 2.1 Personas cibles

| Persona | Besoin principal |
|---|---|
| Micro-entrepreneur / indépendant (franchise en base) | Comprendre s'il est concerné (oui), facturer conforme sans logiciel existant |
| TPE/PME avec facturier existant | Vérifier la conformité, générer les nouveaux formats, se connecter à une PA |
| Expert-comptable / cabinet | Suivre la conformité d'un portefeuille de clients (multi-dossiers) |

### 2.2 Proposition de valeur différenciante

- **Agent IA réglementaire** en français, adossé à la base de connaissances officielle (DGFiP), avec fallback hors-ligne — déjà amorcé dans `src/fns/ai-agent.ts`.
- **Diagnostic de conformité** en 4 questions (inspiré du questionnaire officiel impots.gouv.fr « qu'est-ce que ça change pour moi ? »).
- **Validation automatique des mentions obligatoires** avant émission.

---

## 3. Exigences fonctionnelles

### Module A — Onboarding & diagnostic de conformité (MVP)

- **A1.** Questionnaire de qualification : taille d'entreprise (GE/ETI/PME/micro), régime TVA (redevable / franchise en base), typologie clients (B2B FR / B2C / étranger / secteur public), outillage actuel.
- **A2.** Restitution : obligations applicables + **échéances personnalisées** (01/09/2026 vs 01/09/2027) + volets concernés (e-invoicing / e-reporting transaction / e-reporting paiement).
- **A3.** Checklist de mise en conformité générée automatiquement, avec suivi de progression.
- **A4.** Vérification du client dans l'**annuaire de la facturation électronique** : recherche par SIREN/SIRET ou dénomination, récupération de la PA de réception et de l'adresse électronique de facturation.

### Module B — Création et gestion de factures (MVP)

- **B1.** Éditeur de facture avec contrôle bloquant des **mentions obligatoires du cadre général** :
  - date d'émission ; numéro unique (séquence chronologique continue) ; date de la vente/prestation ;
  - identité vendeur (nom, adresse, SIREN/SIRET) ; identité client (nom, adresse, adresse de facturation si différente) ;
  - numéro de bon de commande le cas échéant ; numéros de TVA intracommunautaire vendeur + client (si facture > 150 € HT) ;
  - par ligne : quantité, dénomination précise, prix unitaire HT, taux de TVA (ventilé par taux) ;
  - total HT et TTC ; réductions (rabais, remises, ristournes, escomptes) ;
  - date/délai de paiement, conditions d'escompte, taux de pénalités de retard, **indemnité forfaitaire de recouvrement de 40 €**.
- **B2.** Les **4 nouvelles mentions obligatoires 2026** (bloquantes à l'émission) :
  1. **SIREN du client** ;
  2. **catégorie de l'opération** : livraison de biens / prestation de services / mixte ;
  3. mention « *Option pour le paiement de la taxe d'après les débits* » le cas échéant ;
  4. **adresse de livraison** si différente de l'adresse de facturation.
- **B3.** Mentions particulières conditionnelles : « *TVA non applicable, art. 293 B du CGI* » (franchise en base) ; « *Auto-liquidation* » ; « *Membre d'une association agréée…* » ; garantie légale de conformité (B2C, biens concernés).
- **B4.** Génération multi-formats : **Factur-X** (PDF/A-3 + XML CII) en priorité, export **UBL** et **CII**.
- **B5.** Gestion devis → facture, avoirs, acomptes, factures récurrentes.
- **B6.** Base clients/fournisseurs enrichie (SIREN vérifié via annuaire/API INSEE), en français ; devise étrangère possible (comptabilisation en euros).

### Module C — Transmission via plateforme agréée (V1)

- **C1.** Connecteurs API vers au moins **2 plateformes agréées** de la liste officielle DGFiP (choix à valider en phase de cadrage ; la liste officielle ODS/XLSX/PDF sert de référentiel). **→ État des lieux des API disponibles et candidats présélectionnés : voir Annexe A** (Qonto PAaaS, Iopole, B2Brouter, Super PDP, Seqino). Architecture : interface pivot interne inspirée d'AFNOR XP Z12-013 + un adaptateur par PA.
- **C2.** Routage automatique : lookup annuaire → adresse électronique du destinataire → dépôt sur la PA.
- **C3.** Réception : ingestion des factures fournisseurs depuis la PA de l'utilisateur, notification à réception, boîte de réception unifiée (« stockage unique »).
- **C4.** **Cycle de vie / statuts** : affichage temps réel horodaté des statuts (émise, déposée, rejetée, refusée, prise en charge, approuvée, payée/encaissée) côté vente et côté achat.
- **C4bis.** **Workflow de refus** : une facture techniquement conforme peut être **refusée commercialement** par le destinataire. L'app doit permettre de refuser une facture reçue (avec motif), notifier la PA pour propagation du refus à l'émetteur et annulation des données transmises à la DGFiP ; côté vente, alerter l'utilisateur en cas de refus et faciliter la correction/réémission (avoir + nouvelle facture).
- **C4ter.** **Multi-plateformes** : supporter le rattachement de plusieurs PA par entreprise (ex. une pour les ventes, une pour les achats, ou une par SIRET), avec routage des flux par plateforme.
- **C5.** Cas hors e-invoicing : client particulier ou étranger → émission par canal classique (PDF/mail) + génération automatique des données de **e-reporting** transmises à la PA.
- **C6.** E-reporting de paiement : saisie/rapprochement des encaissements pour les prestations de services concernées, transmission des montants encaissés.
- **C7.** B2G : lien/export vers **Chorus Pro** pour les factures aux entités publiques (hors MVP, documenter la limite).

### Module D — Agent IA réglementaire (existant, à renforcer)

- **D1.** Chat en français, base de connaissances alignée sur la documentation DGFiP (guide pratique sept. 2026, FAQ, fiches pédagogiques) ; réponses sourcées.
- **D2.** Fallback base de connaissances locale si pas de clé OpenAI (déjà implémenté).
- **D3.** Garde-fous : renvoi vers expert-comptable / n° national 0 806 807 807 en cas d'incertitude ; disclaimer « ne constitue pas un conseil fiscal ».
- **D4.** Mise à jour de la base à chaque évolution réglementaire (procédure de veille : impots.gouv.fr, economie.gouv.fr, Légifrance).

### Module E — Tableau de bord & pilotage (MVP partiel, existant)

- **E1.** KPI : CA facturé, encours clients, retards de paiement, factures par statut, échéancier.
- **E2.** Score de conformité de l'entreprise (checklist Module A + qualité des factures émises).
- **E3.** Exports comptables (CSV, FEC-friendly) pour l'expert-comptable.

### Module F — Compte, abonnements, API (existant, à compléter)

- **F1.** Plans **Starter / Pro / Enterprise** via Stripe (checkout existant) ; différenciation : volume de factures, nombre de connecteurs PA, multi-dossiers, API. Le pricing devra intégrer le **coût de transmission des PA** (~0,10 € à 1 €/facture ou forfait selon la plateforme) : refacturation au réel, marge incluse dans l'abonnement, ou palier de volume.
- **F2.** API publique documentée (route `api-docs` existante) pour l'intégration par des logiciels tiers.
- **F3.** Authentification, rôles (dirigeant, comptable, collaborateur), multi-entreprises.

---

## 4. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| **Archivage** | Conservation des factures **10 ans** (pièces comptables) ; archivage à valeur probante (intégrité, horodatage) |
| **RGPD** | Données hébergées UE, registre des traitements, DPA avec sous-traitants (PA, OpenAI, Stripe), minimisation des données envoyées au LLM |
| **Sécurité** | Chiffrement au repos et en transit, authentification forte, journalisation des accès ; s'aligner sur les exigences d'immatriculation des PA (sécurité infra/données) |
| **Intégrité** | Numérotation de factures inaltérable et séquentielle ; aucune modification d'une facture émise (avoir obligatoire) |
| **Disponibilité** | SLA 99,5 % ; file de reprise si une PA est indisponible |
| **Interopérabilité** | Conformité **EN 16931** (norme sémantique européenne) pour les formats UBL/CII/Factur-X |
| **Langue** | Interface et factures en français (traduction certifiée possible sur demande de l'administration) |
| **Accessibilité** | RGAA / WCAG AA |

---

## 5. Architecture technique (existant à faire évoluer)

- **Front/SSR :** TanStack Start + React 19, Tailwind CSS 4, shadcn/Radix, Recharts (dashboard).
- **Serveur :** server functions TanStack (`src/fns/`), déploiement Cloudflare (Wrangler présent), Nitro.
- **Paiements :** Stripe (checkout + webhooks à ajouter pour la gestion du cycle d'abonnement).
- **IA :** OpenAI (gpt-4o-mini) + base de connaissances locale `compliance-knowledge`.
- **À ajouter :**
  - **Base de données persistante** (D1/Postgres) : entreprises, clients, factures, statuts, encaissements — actuellement absente, prérequis de tout le reste ;
  - librairie de génération **Factur-X/UBL/CII** + validation EN 16931 ;
  - couche connecteurs PA (webhooks statuts entrants) ;
  - stockage objet pour l'archivage 10 ans (R2/S3) ;
  - authentification.

---

## 6. Lotissement proposé

| Lot | Contenu | Cible |
|---|---|---|
| **Lot 0 — Socle** | DB, auth, multi-entreprises, webhooks Stripe | T3 2026 |
| **Lot 1 — MVP conformité** | Modules A (diagnostic + annuaire), B (factures conformes + Factur-X), D (agent IA renforcé), E (dashboard) | Avant le 01/09/2026 |
| **Lot 2 — Transmission** | Module C : 1er connecteur PA, réception, statuts, e-reporting transaction | T4 2026 |
| **Lot 3 — Échelle** | 2e connecteur PA, e-reporting paiement, multi-dossiers expert-comptable, API publique | T1–T2 2027 (avant l'échéance PME du 01/09/2027) |

---

## 7. Références officielles

- Page dossier : economie.gouv.fr « Tout savoir sur la facturation électronique pour les entreprises »
- **Guide pratique de démarrage au 1er septembre 2026** (DGFiP, juillet 2026, 29 questions — analysé le 18/07/2026, synthèse en §1.7) : impots.gouv.fr/…/guide_pratique_facturation_electronique.pdf
- Loi de finances 2026 : sanctions relevées (synthèse en §1.6) — CGI art. 1737 (III, IV, IV bis), 1788 D, 1788 E
- FAQ « Je découvre la facturation électronique »
- Fiches pédagogiques TPE (impots.gouv.fr) : obligations, calendrier, équipement
- Liste officielle des plateformes agréées : impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees
- Annuaire : facturation.chorus-pro.gouv.fr
- Textes : ordonnance n° 2021-1190 ; décret n° 2022-1299 ; décret n° 2024-266 ; LF 2024 art. 91 ; CGI art. 289 et 242 nonies A (annexe 2) ; Code de commerce L441-3/L441-4 ; CGI art. 1737 (sanctions)
- Assistance nationale : **0 806 807 807**
- Source complémentaire (non officielle) : facture-electronique-france.org « Quels portails pour quelles spécificités ? » (11/2023 — ⚠️ obsolète sur le rôle du PPF, retenue uniquement pour le workflow de refus, le multi-plateformes et les modèles tarifaires des PA)

## 8. Glossaire

| Terme | Définition |
|---|---|
| **E-invoicing** | Émission/réception de factures via plateforme de dématérialisation |
| **E-reporting** | Transmission électronique des données de transaction et de paiement à la DGFiP |
| **PA (plateforme agréée)** | Prestataire immatriculé par l'État, intermédiaire obligatoire (ex-PDP) |
| **Solution compatible** | Logiciel non immatriculé s'appuyant sur une PA (= InvoicePilot AI) |
| **PPF** | Portail Public de Facturation — annuaire + concentrateur de données vers la DGFiP (pas de service d'échange gratuit, schéma abandonné fin 2024) |
| **PDP** | Ancienne appellation des plateformes agréées (Plateforme de Dématérialisation Partenaire) |
| **Factur-X** | Format mixte franco-allemand : PDF lisible + XML CII structuré |
| **EN 16931** | Norme sémantique européenne de la facture électronique |
| **AFNOR XP Z12-013** | Norme d'API française pour interfacer les SI des entreprises avec les plateformes agréées (interopérabilité des connecteurs) |

---

## Annexe A — Connecteurs API PA : état des lieux (recherche du 19/07/2026)

**Conclusion : oui, l'intégration API OD → PA est possible dès aujourd'hui pour l'émission ET la réception.** Plusieurs plateformes agréées de la liste DGFiP exposent des API publiques documentées avec sandbox, pensées pour les éditeurs / solutions compatibles comme InvoicePilot AI.

Deux approches d'intégration coexistent sur le marché :
1. **API propriétaire de la PA** (cas général — Qonto, B2Brouter, Iopole…) : un adaptateur par plateforme.
2. **Norme AFNOR XP Z12-013** : standard d'API pour interfacer les SI avec les PA. Certaines PA l'implémentent, d'autres non (ex. Qonto ne la suit pas mais couvre les mêmes cas d'usage). → À utiliser comme **interface pivot interne** de notre couche connecteurs, avec des adaptateurs par PA.

### A.1 Candidats vérifiés (API publiques, orientées éditeurs)

| PA | Offre éditeur | Émission | Réception | Sandbox | Statuts | Onboarding client final |
|---|---|---|---|---|---|---|
| **Qonto** (« PA as a Service ») | API REST propriétaire, OAuth (`client_invoice.write`) | `POST /v2/client_invoices/bulk` (import Factur-X/UBL 2.1/CII) puis `POST /v2/client_invoices/{id}/send_by_einvoice` | `GET /v2/supplier_invoices` | Oui (documentée) | Polling `GET /v2/client_invoices/{id}` ; **webhooks annoncés** | Compte « Qonto PA » **gratuit (0 €/mois)**, créable par API (Onboarding API `registrations`) |
| **B2Brouter** | API REST + SDK, marque blanche ou grise | Oui (multi-format : Factur-X, UBL, CII, EDIFACT…) | Oui | Oui — même URL de base `api.b2brouter.net`, routage par clé de test | Webhooks + changements de statut | Portail ou API ; pilote gratuit jusqu'au 31/08/2026 |
| **Iopole** (pure player éditeurs) | API REST « pensée éditeurs », marque blanche | Oui (CII, UBL, Peppol BIS/PINT, Factur-X, JSON — conversion incluse) | Oui | Environnement de test **gratuit** | Oui (supervision des flux) | API `/enrollment` : lien magique, KYC/KYB + **signature du mandat PA** automatisée |
| **Super PDP** | API simple, positionnement low-cost | Oui (e-invoicing + e-reporting) | Oui | Oui, accès libre | Oui | — |
| **Seqino** | API REST, SDK multi-langages, marque blanche/grise | Oui (Factur-X natif) | Oui | Oui | Oui | — |

Sources : docs.qonto.com (PA as a Service + e-invoicing standards), b2brouter.net (API + FAQ sandbox), iopole.com (solution/onboarding), francenum.gouv.fr (Super PDP), seqino.com.

### A.2 Fonctions annexes utiles repérées

- **Annuaire** : Iopole expose une API unifiée annuaire français + annuaire Peppol (utile pour le Module A4 / C2 — lookup de la PA du destinataire).
- **E-reporting** : couvert par les API Super PDP, Iopole, B2Brouter (Module C5/C6).
- **Archivage à valeur probante** : coffre NF 461 chez Iopole (exigence « archivage 10 ans » §4).
- **Cachet électronique / KYC-KYB** : Iopole (authenticité + onboarding réglementaire).
- **Peppol** : B2Brouter et Iopole sont points d'accès Peppol certifiés (fallback d'adressage prévu par le guide DGFiP §1.7).

### A.3 Critères de sélection des 2 connecteurs (Module C1)

1. Sandbox en libre accès (pas de cycle commercial pour commencer à développer) ;
2. Webhooks de statuts (vs polling) — le cycle de vie temps réel est central (C4) ;
3. Onboarding du client final automatisable par API (mandat PA, KYC/KYB) — critique pour un SaaS self-service ;
4. Coût par facture / modèle de refacturation (impacte le pricing F1) ;
5. Couverture e-reporting transaction + paiement ;
6. Accès API à l'annuaire.

**Recommandation initiale** : démarrer le Lot 2 avec **Qonto PAaaS** (gratuit pour l'utilisateur final, onboarding API, docs publiques, cible TPE/indépendants identique à la nôtre) + **Iopole** ou **B2Brouter** en second connecteur (annuaire unifié, Peppol, e-reporting complet, marque blanche). À valider par un POC sandbox sur chaque candidat.
