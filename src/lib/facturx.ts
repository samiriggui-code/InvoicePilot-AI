/** Génération Factur-X minimale (CII-like XML) — POC Phase 1. */

export type FacturXPayload = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  currency?: string;
  seller: {
    legalName: string;
    siren: string;
    vatNumber?: string | null;
  };
  buyer: {
    legalName: string;
    siren: string;
  };
  operationCategory: "GOODS" | "SERVICES" | "MIXED";
  lines: {
    lineNumber: number;
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
    lineTotalHt: number;
    lineVat: number;
  }[];
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CATEGORY_LABEL: Record<string, string> = {
  GOODS: "Livraison de biens",
  SERVICES: "Prestation de services",
  MIXED: "Opération mixte",
};

/** XML Factur-X / CII simplifié (EN 16931-inspired) pour POC. */
export function buildFacturXXml(p: FacturXPayload): string {
  const linesXml = p.lines
    .map(
      (l) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${l.lineNumber}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(l.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${l.unitPriceHt.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${l.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${l.vatRate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${l.lineTotalHt.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- InvoicePilot AI — Factur-X / CII POC (solution compatible, pas une PA) -->
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(p.number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${p.issueDate.replace(/-/g, "")}</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>Catégorie d'opération 2026 : ${CATEGORY_LABEL[p.operationCategory] ?? p.operationCategory}</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${linesXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(p.seller.legalName)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${esc(p.seller.siren)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(p.buyer.legalName)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${esc(p.buyer.siren)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${p.currency ?? "EUR"}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${p.subtotalHt.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${p.subtotalHt.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${p.totalVat.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${p.totalTtc.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${p.totalTtc.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

/** Résumé lisible (couche PDF-like du hybride Factur-X) pour POC. */
export function buildFacturXReadableSummary(p: FacturXPayload): string {
  const lines = p.lines
    .map(
      (l) =>
        `  ${l.lineNumber}. ${l.description} — ${l.quantity} × ${l.unitPriceHt.toFixed(2)} € HT (TVA ${l.vatRate} %) = ${l.lineTotalHt.toFixed(2)} €`,
    )
    .join("\n");

  return `FACTUR-X — FACTURE ÉLECTRONIQUE (POC InvoicePilot AI)
========================================================
N° ${p.number}          Date d'émission : ${p.issueDate}
Devise : ${p.currency ?? "EUR"}
Catégorie d'opération (mention 2026) : ${CATEGORY_LABEL[p.operationCategory] ?? p.operationCategory}

VENDEUR
  ${p.seller.legalName}
  SIREN ${p.seller.siren}${p.seller.vatNumber ? `\n  TVA ${p.seller.vatNumber}` : ""}

ACHETEUR
  ${p.buyer.legalName}
  SIREN ${p.buyer.siren}

LIGNES
${lines}

TOTAUX
  HT  : ${p.subtotalHt.toFixed(2)} €
  TVA : ${p.totalVat.toFixed(2)} €
  TTC : ${p.totalTtc.toFixed(2)} €

---
Document généré par InvoicePilot AI (solution compatible).
La transmission légale reste assurée par une plateforme agréée (PA).
`;
}
