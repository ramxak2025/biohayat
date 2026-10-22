/** Must match the separately published document and the client choice. Never infer consent for old clients. */
export const REGISTRATION_CONSENT_VERSION = "2026-10-22";
export type RegistrationChannel = "web" | "mobile-v2" | "mobile-v1";
export function registrationConsentReceipt(channel: RegistrationChannel) {
  return {
    version: REGISTRATION_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    channel,
    purpose: "account-registration",
    documentPath: "/personal-data-consent",
  };
}
