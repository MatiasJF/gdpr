"use client";
import type { BrowserWallet } from "@bsv/simple/browser";
import {
  CONSENT_BASKET,
  REVOCATION_BASKET,
  type ConsentInscriptionV1,
  type ConsentRevocationV1,
} from "./schema";
import { parseScriptForConsent } from "./parseInscription";

// We use inscribeJSON, NOT createToken. createToken encrypts the data with a
// wallet-derived key (counterparty: 'self') so the on-chain bytes are
// unreadable to any third party — which would break the public-verifiability
// claim the whole architecture rests on. inscribeJSON writes plaintext JSON.
export async function issueConsentToken(
  wallet: BrowserWallet,
  inscription: ConsentInscriptionV1,
) {
  return wallet.inscribeJSON(inscription, {
    basket: CONSENT_BASKET,
    description: "GDPR consent inscription",
  });
}

export type LiveConsent = { outpoint: string; data: ConsentInscriptionV1 };

export async function listConsentTokens(
  wallet: BrowserWallet,
): Promise<LiveConsent[]> {
  const client = wallet.getClient();
  const [consentResult, revocationResult] = await Promise.all([
    client.listOutputs({
      basket: CONSENT_BASKET,
      include: "locking scripts",
    }),
    client.listOutputs({
      basket: REVOCATION_BASKET,
      include: "locking scripts",
    }),
  ]);

  const revokedRefs = new Set<string>();
  for (const o of (revocationResult as { outputs?: Array<{ outpoint: string; lockingScript: string }> }).outputs ?? []) {
    const parsed = parseScriptForConsent(o.lockingScript);
    if (parsed?.kind === "revocation") revokedRefs.add(parsed.data.ref);
  }

  const live: LiveConsent[] = [];
  for (const o of (consentResult as { outputs?: Array<{ outpoint: string; lockingScript: string }> }).outputs ?? []) {
    if (revokedRefs.has(o.outpoint)) continue;
    const parsed = parseScriptForConsent(o.lockingScript);
    if (parsed?.kind === "consent") {
      live.push({ outpoint: o.outpoint, data: parsed.data });
    }
  }
  return live;
}

// Revocation publishes a plaintext revocation inscription that references the
// original consent outpoint. The original consent output is left unspent;
// "live state" is computed as consents-minus-revocations by walking the
// inscription baskets, not by checking spent state on the consent outpoint.
export async function revokeConsentToken(
  wallet: BrowserWallet,
  outpoint: string,
  revokedAt: string = new Date().toISOString(),
) {
  const revocation: ConsentRevocationV1 = {
    type: "gdpr-consent-revocation-v1",
    ref: outpoint,
    revoked_at: revokedAt,
  };
  return wallet.inscribeJSON(revocation, {
    basket: REVOCATION_BASKET,
    description: "GDPR consent revocation",
  });
}
