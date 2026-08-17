/** Libellés FR pour les entrées AuditLog — une seule source, partagée par tableau de bord et journal équipe. */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  // Équipe
  "team.member_joined": "A rejoint l’organisation",
  "team.role_updated": "Rôle mis à jour",
  "team.member_archived": "Compte archivé",
  "team.member_restored": "Compte restauré",
  "team.member_removed": "Retiré de l’organisation",
  "team.avatar_updated": "Avatar mis à jour",

  // Clés API
  "api_key.created": "Clé API créée",
  "api_key.revoked": "Clé API révoquée",

  // Plateforme agréée (PA)
  "pa.connected": "Plateforme agréée connectée",
  "pa.preferred_changed": "Plateforme agréée préférée modifiée",
  "pa.disconnected": "Plateforme agréée déconnectée",
  "platform.connected": "Plateforme agréée connectée",

  // Sources / intégrations
  "integration.connected": "Source connectée",
  "integration.disconnected": "Source déconnectée",
  "integration.shopify.connected": "Shopify connecté",
  "integration.shopify.disconnected": "Shopify déconnecté",
  "integration.shopify.synced": "Shopify synchronisé",
  "integration.shopify.imported_blocked": "Commande Shopify importée — bloquée",
  "integration.shopify.imported_ready": "Commande Shopify importée — prête",
  "integration.woocommerce.connected": "WooCommerce connecté",
  "integration.woocommerce.disconnected": "WooCommerce déconnecté",
  "integration.sources.updated": "Sources mises à jour",
  "integration.source.added": "Source ajoutée",
  "integration.source.removed": "Source retirée",
  "integration.pdf.uploaded": "PDF importé",

  // E-reporting
  "e_reporting.refreshed": "E-reporting actualisé",
  "e_reporting.generated": "Entrée e-reporting générée",
  "e_reporting.transmitted": "E-reporting transmis",

  // Acheteurs / annuaire
  "counterparty.enriched": "Acheteur enrichi (annuaire)",
  "counterparty.auto_enriched": "Acheteur enrichi automatiquement",

  // Factures / acheteurs (réservé)
  "invoice.created": "Facture créée",
  "invoice.updated": "Facture mise à jour",
  "invoice.validated": "Facture validée",
  "client.created": "Acheteur ajouté",
  "client.updated": "Acheteur mis à jour",
};

/** Traduit une action AuditLog technique (`module.verbe`) en libellé FR lisible. */
export function formatAuditActionLabel(action: string, entityType?: string | null): string {
  const known = AUDIT_ACTION_LABELS[action];
  if (known) return known;

  const readable = action.split(".").filter(Boolean).join(" ").replace(/_/g, " ");
  return entityType ? `${readable} — ${entityType}` : readable;
}
