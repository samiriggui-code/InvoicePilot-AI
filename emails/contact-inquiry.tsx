import { Heading, Text } from "react-email";

import { EmailLayout, emailBrand } from "./_components/EmailLayout";

export type ContactInquiryEmailProps = {
  name: string;
  email: string;
  subject: string;
  message: string;
  logoUrl?: string;
};

/** Notification interne — nouveau message contact. */
export function ContactInquiryEmail({
  name = "Visiteur",
  email = "contact@example.com",
  subject = "Demande",
  message = "",
  logoUrl,
}: ContactInquiryEmailProps) {
  return (
    <EmailLayout preview={`Contact : ${subject}`} logoUrl={logoUrl}>
      <Heading style={styles.h1}>Nouveau message contact</Heading>
      <Text style={styles.text}>
        <strong>De :</strong> {name} &lt;{email}&gt;
      </Text>
      <Text style={styles.text}>
        <strong>Sujet :</strong> {subject}
      </Text>
      <Text style={styles.label}>Message</Text>
      <Text style={styles.box}>{message}</Text>
    </EmailLayout>
  );
}

export default ContactInquiryEmail;

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
    margin: "0 0 10px",
  },
  label: {
    color: emailBrand.muted,
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    margin: "18px 0 8px",
  },
  box: {
    color: emailBrand.text,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
    padding: "14px 16px",
    backgroundColor: emailBrand.bg,
    borderRadius: "8px",
    border: `1px solid ${emailBrand.border}`,
    whiteSpace: "pre-wrap" as const,
  },
};
