# `src/api` — pont InvoicePilot

Structure figée (voir `docs/ARCHITECTURE_PONT.md`).

```
canonical/     CanonicalInvoice + helpers
storage/       clés objet + persist StorageObject
connectors/
  sources/     SourceConnector (Shopify, Woo, HTTP…)
  pa/          PaConnector (sandbox → partenaires)
pipeline/      enchaînement centre de tri
http/          handlers /v1 (à brancher sur le routeur)
```

**Ne pas** mettre de logique PA dans un connecteur Shopify.  
**Ne pas** parser du JSON Shopify dans un adaptateur PA.
