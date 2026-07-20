import { Button, Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type TeamInviteEmailProps = {
  inviterName: string;
  organizationName: string;
  roleLabel: string;
  inviteUrl: string;
  expiresLabel: string;
  logoUrl?: string;
};

/** Invitation collègue — lien d’acceptation. */
export function TeamInviteEmail({
  inviterName = "Un collègue",
  organizationName = "Votre entreprise",
  roleLabel = "Collaborateur",
  inviteUrl = "https://invoicepilot.ai/invite/demo",
  expiresLabel = "dans 14 jours",
  logoUrl,
}: TeamInviteEmailProps) {
  return (
    <EmailLayout
      preview={`${inviterName} vous invite sur InvoicePilot — ${organizationName}`}
      logoUrl={logoUrl}
    >
      <Heading style={styles.h1}>Vous êtes invité(e)</Heading>
      <Text style={styles.text}>
        <strong>{inviterName}</strong> vous invite à rejoindre l’organisation{" "}
        <strong>{organizationName}</strong> sur InvoicePilot AI en tant que{" "}
        <strong>{roleLabel}</strong>.
      </Text>
      <Text style={styles.text}>
        Cliquez sur le bouton ci-dessous pour accepter. Le lien expire {expiresLabel}.
      </Text>
      <Button href={inviteUrl} style={styles.button}>
        Accepter l’invitation
      </Button>
      <Text style={styles.muted}>
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
      </Text>
      <Text style={styles.linkBreak}>{inviteUrl}</Text>
    </EmailLayout>
  );
}

export default TeamInviteEmail;

const styles = {
  h1: {
    color: emailBrand.text,
    fontSize: "22px",
    fontWeight: 600,
    lineHeight: "28px",
    margin: "0 0 16px",
  },
  text: {
    color: emailBrand.text,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 14px",
  },
  muted: {
    color: emailBrand.muted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "24px 0 8px",
  },
  linkBreak: {
    color: emailBrand.primary,
    fontSize: "12px",
    lineHeight: "18px",
    wordBreak: "break-all" as const,
    margin: "0",
  },
  button: {
    backgroundColor: emailBrand.primary,
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "100%",
    padding: "14px 22px",
    textDecoration: "none",
    marginTop: "8px",
  },
};
