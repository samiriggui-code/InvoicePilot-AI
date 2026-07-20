import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from "react-email";
import type { ReactNode } from "react";

const brand = {
  primary: "#2563eb",
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  bg: "#fafafa",
  white: "#ffffff",
};

export function EmailLayout({
  preview,
  children,
  logoUrl,
}: {
  preview: string;
  children: ReactNode;
  logoUrl?: string;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            {logoUrl ? (
              <Img
                src={logoUrl}
                width="160"
                height="28"
                alt="InvoicePilot AI"
                style={styles.logo}
              />
            ) : (
              <Text style={styles.brandText}>InvoicePilot AI</Text>
            )}
          </Section>
          <Section style={styles.card}>{children}</Section>
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              InvoicePilot AI — solution compatible facturation électronique (France).
            </Text>
            <Text style={styles.footerText}>
              Vous recevez cet e-mail car une action a été demandée sur votre espace.
            </Text>
          </Section>
          <Hr style={styles.hr} />
        </Container>
      </Body>
    </Html>
  );
}

export const emailBrand = brand;

const styles = {
  body: {
    backgroundColor: brand.bg,
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    margin: "0",
    padding: "24px 12px",
  },
  container: {
    margin: "0 auto",
    maxWidth: "560px",
  },
  header: {
    padding: "8px 8px 20px",
  },
  logo: {
    display: "block",
  },
  brandText: {
    color: brand.primary,
    fontSize: "18px",
    fontWeight: 700,
    margin: "0",
  },
  card: {
    backgroundColor: brand.white,
    border: `1px solid ${brand.border}`,
    borderRadius: "12px",
    padding: "32px 28px",
  },
  footer: {
    padding: "20px 8px 0",
  },
  footerText: {
    color: brand.muted,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 6px",
  },
  hr: {
    borderColor: brand.border,
    marginTop: "24px",
  },
} as const;
