# Carte des pages — sidebar figée

**Figé :** 18 juillet 2026

## Ordre sidebar (sections)

```
Pilotage     Tableau de bord → Conformité
Configurer   Sources → Acheteurs → Ma PA → Analyse IA
Flux         Émission → Réception → E-reporting
Compte       Utilisateurs → Abonnement → Paramètres
```

## Utilisateurs (hors sidebar pour les sous-pages)

| URL | Rôle | Réf. Metronic |
|-----|------|----------------|
| `/profile` | Mon profil (dropdown user) | [user-profile](https://keenthemes.com/metronic/tailwind/demo9/account/home/user-profile) |
| `/team` | Membres + invitation + archive/suppression | [team-members](https://keenthemes.com/metronic/tailwind/react/demo1/account/members/team-members) |
| `/team/members/$id` | Profil d’un membre (clic nom / œil) | team member detail |
| `/team/roles` | Cartes des rôles | [roles](https://keenthemes.com/metronic/tailwind/react/demo1/account/members/roles) |
| `/team/permissions` | Matrice permissions | [permissions-toggle](https://keenthemes.com/metronic/tailwind/react/demo1/account/members/permissions-toggle) |

Sidebar Compte : **un seul** item « Utilisateurs » → `/team`. Rôles / Permissions = onglets internes.

Dropdown user : **Mon profil** → `/profile`. OWNER/ADMIN : archiver (soft) ou supprimer (retrait membership) depuis `/team`.

Isolation : toutes les requêtes filtrent sur `organizationId` du workspace actif (`OrganizationMember` / `OrganizationInvite`).

## Abonnement (hors sidebar pour les sous-pages)

| URL | Rôle | Réf. Metronic |
|-----|------|----------------|
| `/billing` | Vue d’ensemble (page principale) | [enterprise](https://keenthemes.com/metronic/tailwind/react/demo1/account/billing/enterprise) |
| `/billing/plans` | Comparer les plans (lien interne) | [plans](https://keenthemes.com/metronic/tailwind/react/demo1/account/billing/plans) |
| `/billing/history` | Historique factures (lien interne) | [history](https://keenthemes.com/metronic/tailwind/react/demo1/account/billing/history) |

Sidebar Compte : **un seul** item « Abonnement » → `/billing`. Plans / Historique = onglets / liens dans la page, **pas** dans la sidebar.


## Conformité = inscription + loi

La page `/compliance` affiche :
- sources choisies à l’inscription + état de branchement réel
- PA choisie + usage (émission / réception / les deux) + canal technique
- dates butoirs réception / émission (chronologie légale)
- checklist opérationnelle

Ce n’est **pas** une page décorative séparée du parcours client.
