# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. The only root layout is `src/routes/__root.tsx`.

## Architecture

| Zone | Layout | Exemples d'URL |
| --- | --- | --- |
| **Marketing** (public) | `_marketing.tsx` — Header + Footer landing | `/`, `/$slug` (ex. `/mentions-legales`) |
| **Docs API** | app Mintlify `apps/docs` (port 3004) | `http://localhost:3004` — `/api-docs` redirige |
| **Auth** (public) | `AuthBrandedLayout` — split screen + 2FA | `/login`, `/signup`, `/2fa`, `/forgot-password`, `/reset-password` |
| **Application SaaS** (protégée) | `_app.tsx` — AppShell (sidebar) + workspace | `/dashboard`, `/invoices`, `/clients`, `/compliance`, `/agent`, `/settings` |
| **Post-paiement** | standalone | `/checkout/success` |

## App SaaS

| Route | Contenu |
| --- | --- |
| `/dashboard` | KPI + factures récentes (Prisma) |
| `/invoices` | Liste + création factures (mentions 2026) |
| `/clients` | Liste + création clients |
| `/compliance` | Diagnostic Module A + checklist |
| `/platforms` | Connexions plateformes agréées |
| `/settings` | Org + abonnement Stripe |

Assistant réglementaire : FAB + sheet (pas dans la sidebar). `/agent` redirige vers le dashboard.

## Auth (Lot 0 — PostgreSQL)

1. `/signup` — création compte + org + essai Pro 14 jours
2. `/login` — vérification mot de passe (scrypt)
3. `/2fa` — code OTP en base (`two_factor_codes`), session cookie httpOnly
4. Routes `/_app/*` protégées via `getWorkspace()` (user + org + subscription)

**Comptes démo :** `npm run db:seed` → `owner@dupont.fr` / `Test1234!`
