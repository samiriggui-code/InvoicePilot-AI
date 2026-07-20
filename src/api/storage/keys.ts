import type { StorageObjectKind } from "@prisma/client";

/** Clés objet stables — un dossier logique par organisation (centre de tri). */
export function orgRoot(organizationId: string) {
  return `org/${organizationId}`;
}

export function sourceRawKey(organizationId: string, provider: string, externalId: string) {
  return `${orgRoot(organizationId)}/sources/${provider}/${externalId}/raw.json`;
}

export function sourcePdfKey(organizationId: string, externalId: string) {
  return `${orgRoot(organizationId)}/sources/manual_upload/${externalId}/source.pdf`;
}

export function canonicalKey(organizationId: string, invoiceId: string) {
  return `${orgRoot(organizationId)}/invoices/${invoiceId}/canonical.json`;
}

export function facturxXmlKey(organizationId: string, invoiceId: string) {
  return `${orgRoot(organizationId)}/invoices/${invoiceId}/factur-x.xml`;
}

export function paOutboxKey(
  organizationId: string,
  invoiceId: string,
  stamp: string,
  suffix: "submit" | "response",
) {
  return `${orgRoot(organizationId)}/pa/outbox/${invoiceId}/${stamp}-${suffix}.json`;
}

export function paInboxKey(organizationId: string, paReference: string) {
  return `${orgRoot(organizationId)}/pa/inbox/${paReference}/raw.json`;
}

export const STORAGE_MIME: Record<StorageObjectKind, string> = {
  SOURCE_RAW: "application/json",
  CANONICAL_JSON: "application/json",
  FACTURX_XML: "application/xml",
  FACTURX_PDF: "application/pdf",
  PA_SUBMIT: "application/json",
  PA_RESPONSE: "application/json",
  INBOUND_RAW: "application/json",
  VALIDATION_JOURNAL: "application/json",
};
