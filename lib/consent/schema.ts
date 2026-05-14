export const CONSENT_BASKET = "gdpr-consent-v1";
export const REVOCATION_BASKET = "gdpr-consent-revocation-v1";

export type ConsentInscriptionV1 = {
  type: "gdpr-consent-v1";
  controller: string;
  subject_pseudonym: string;
  purpose_ids: string[];
  policy_hash: string;
  issued_at: string;
  scope_expiry: string | null;
};

export type ConsentRevocationV1 = {
  type: "gdpr-consent-revocation-v1";
  ref: string;
  revoked_at: string;
};

export function isConsent(o: unknown): o is ConsentInscriptionV1 {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  return (
    x.type === "gdpr-consent-v1" &&
    typeof x.controller === "string" &&
    typeof x.subject_pseudonym === "string" &&
    Array.isArray(x.purpose_ids) &&
    typeof x.policy_hash === "string" &&
    typeof x.issued_at === "string"
  );
}

export function isRevocation(o: unknown): o is ConsentRevocationV1 {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  return (
    x.type === "gdpr-consent-revocation-v1" &&
    typeof x.ref === "string" &&
    typeof x.revoked_at === "string"
  );
}
