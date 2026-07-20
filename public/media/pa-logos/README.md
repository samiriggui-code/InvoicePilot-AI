# Logos Plateformes Agréées (PA)

Pack d’icônes pour représenter les PA DGFiP dans l’app et la landing.

## Contenu

- `public/media/pa-logos/*` — ~149 fichiers (png / jpg / svg / ico)
- `manifest.json` — mapping slug → fichier + site source
- `src/lib/pa-logos.generated.ts` — map TypeScript pour l’UI

## Sources

1. **Liste PA + sites** : [elginux/pa-dataset](https://github.com/elginux/pa-dataset) (sites vérifiés vs liste DGFiP)
2. **Liste officielle** : [impots.gouv.fr — plateformes agréées](https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees)
3. **Icônes** : Clearbit Logo CDN → Google Favicons → DuckDuckGo Icons (favicon / mark public du domaine officiel)

Les marques restent la propriété de leurs titulaires. Usage nominatif d’identification dans le produit.

## Régénérer

```bash
# dataset déjà dans tmp/pa-list/pa-dataset.json
node scripts/fetch-pa-logos.mjs
node scripts/retry-pa-logos.mjs   # optionnel
```
