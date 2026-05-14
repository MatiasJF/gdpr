"use client";
import type { BrowserWallet } from "@bsv/simple/browser";
import {
  CONSENT_BASKET,
  isConsent,
  type ConsentInscriptionV1,
  type ConsentRevocationV1,
} from "./schema";

export async function issueConsentToken(
  wallet: BrowserWallet,
  inscription: ConsentInscriptionV1,
) {
  return wallet.createToken({
    data: inscription,
    basket: CONSENT_BASKET,
    satoshis: 1,
  });
}

export async function listConsentTokens(wallet: BrowserWallet) {
  const tokens = await wallet.listTokenDetails(CONSENT_BASKET);
  return tokens.filter((t) => isConsent(t.data));
}

// Revocation is two on-chain events: a public revocation inscription so any
// auditor walking the chain can find it, then a redeem so the token leaves the
// subject's live basket. The pair is not atomic — if the redeem fails the
// inscription still stands and the subject's wallet is the source of truth for
// "live state". Documented in the paper's limitations section.
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
  await wallet.inscribeJSON(revocation);
  return wallet.redeemToken({ basket: CONSENT_BASKET, outpoint });
}
