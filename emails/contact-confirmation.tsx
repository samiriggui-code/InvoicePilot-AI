import { Button, Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type ContactConfirmationEmailProps = {
  name: string;
  subject: string;
  logoUrl?: string;
  siteUrl?: string;
};

/** Accusé de réception envoyé au visiteur. */
export function ContactConfirmationEmail({
  name = "là",
  subject = "votre demande",
  logoUrl,
  siteUrl = "https://invoicepilot.ai",
}: ContactConfirmationEmailProps) {
  return (
    <EmailLayout preview="Nous avons bien reçu votre message" logoUrl={logoUrl}>
      <Heading style={styles.h1}>Message reçu</Heading>
      <Text style={styles.text}>Bonjour {name},</Text>
      <Text style={styles.text}>
        Nous avons bien reçu votre message concernant « <strong>{subject}</strong> ». Notre équipe
        revient vers vous sous 2 jours ouvrés (phase démo).
      </Text>
      <Text style={styles.text}>
        InvoicePilot AI est une <strong>solution compatible</strong> — nous ne sommes pas une
        plateforme agréée. Pour le réglementaire général : 0 806 807 807.
      </Text>
      <Button href={siteUrl} style={styles.button}>
        Voir le site
      </Button>
    </EmailLayout>
  );
}

export default ContactConfirmationEmail;

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
