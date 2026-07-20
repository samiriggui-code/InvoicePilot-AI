import { Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type TwoFactorEmailProps = {
  name: string;
  code: string;
  expiresMinutes?: number;
  logoUrl?: string;
};

/** Code OTP connexion 2FA. */
export function TwoFactorEmail({
  name = "là",
  code = "000000",
  expiresMinutes = 10,
  logoUrl,
}: TwoFactorEmailProps) {
  return (
    <EmailLayout preview={`Votre code InvoicePilot : ${code}`} logoUrl={logoUrl}>
      <Heading style={styles.h1}>Code de vérification</Heading>
      <Text style={styles.text}>Bonjour {name},</Text>
      <Text style={styles.text}>
        Voici votre code pour finaliser la connexion à InvoicePilot AI. Il expire dans{" "}
        {expiresMinutes} minutes.
      </Text>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.muted}>
        Si vous n’êtes pas à l’origine de cette connexion, ignorez cet e-mail et changez votre mot
        de passe.
      </Text>
    </EmailLayout>
  );
}

export default TwoFactorEmail;

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
  code: {
    color: emailBrand.text,
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "0.28em",
    lineHeight: "40px",
    margin: "20px 0",
    padding: "16px 20px",
    textAlign: "center" as const,
    backgroundColor: emailBrand.bg,
    borderRadius: "8px",
    border: `1px solid ${emailBrand.border}`,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  muted: {
    color: emailBrand.muted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "24px 0 0",
  },
};
