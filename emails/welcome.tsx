import { Button, Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type WelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
  trialDays?: number;
  logoUrl?: string;
  /** Si renseigné : bienvenue en tant que membre d’équipe (pas d’essai perso). */
  organizationName?: string;
};

/** Bienvenue après inscription. */
export function WelcomeEmail({
  name = "là",
  dashboardUrl = "https://invoicepilot.ai/dashboard",
  trialDays = 14,
  logoUrl,
  organizationName,
}: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Bienvenue sur InvoicePilot, ${name}`} logoUrl={logoUrl}>
      <Heading style={styles.h1}>Bienvenue, {name}</Heading>
      {organizationName ? (
        <Text style={styles.text}>
          Votre compte est prêt. Vous avez rejoint l’organisation{" "}
          <strong>{organizationName}</strong> sur InvoicePilot AI.
        </Text>
      ) : (
        <Text style={styles.text}>
          Votre compte InvoicePilot AI est prêt. Vous disposez de{" "}
          <strong>{trialDays} jours d’essai</strong> pour brancher vos sources et votre PA.
        </Text>
      )}
      <Button href={dashboardUrl} style={styles.button}>
        Ouvrir mon espace
      </Button>
    </EmailLayout>
  );
}

export default WelcomeEmail;

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
