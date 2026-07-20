import { Button, Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type TrialEndingEmailProps = {
  name: string;
  daysLeft: number;
  billingUrl: string;
};

/** Rappel fin d’essai. */
export function TrialEndingEmail({
  name = "là",
  daysLeft = 3,
  billingUrl = "https://invoicepilot.ai/billing",
}: TrialEndingEmailProps) {
  return (
    <EmailLayout preview={`Essai InvoicePilot — ${daysLeft} jour(s) restant(s)`}>
      <Heading style={styles.h1}>Votre essai se termine bientôt</Heading>
      <Text style={styles.text}>Bonjour {name},</Text>
      <Text style={styles.text}>
        Il vous reste{" "}
        <strong>
          {daysLeft} jour{daysLeft > 1 ? "s" : ""}
        </strong>{" "}
        d’essai. Activez un abonnement pour conserver l’accès à votre espace.
      </Text>
      <Button href={billingUrl} style={styles.button}>
        Voir les plans
      </Button>
    </EmailLayout>
  );
}

export default TrialEndingEmail;

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
