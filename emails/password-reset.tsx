import { Button, Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type PasswordResetEmailProps = {
  name: string;
  resetUrl: string;
  expiresMinutes?: number;
  logoUrl?: string;
};

/** Réinitialisation mot de passe. */
export function PasswordResetEmail({
  name = "là",
  resetUrl = "https://invoicepilot.ai/reset",
  expiresMinutes = 30,
  logoUrl,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Réinitialisation de votre mot de passe InvoicePilot" logoUrl={logoUrl}>
      <Heading style={styles.h1}>Réinitialiser le mot de passe</Heading>
      <Text style={styles.text}>Bonjour {name},</Text>
      <Text style={styles.text}>
        Une demande de réinitialisation a été faite pour votre compte. Le lien est valable{" "}
        {expiresMinutes} minutes.
      </Text>
      <Button href={resetUrl} style={styles.button}>
        Choisir un nouveau mot de passe
      </Button>
      <Text style={styles.muted}>
        Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;

const styles = {
  h1: {
    color: emailBrand.text,
    fontSize: "22px",
    fontWeight: 600,
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
    margin: "24px 0 0",
  },
  button: {
    backgroundColor: emailBrand.primary,
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "14px 22px",
    textDecoration: "none",
    marginTop: "8px",
  },
};
