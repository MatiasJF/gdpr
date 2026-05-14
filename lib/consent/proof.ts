"use client";
import type { BrowserWallet } from "@bsv/simple/browser";
import { listConsentTokens } from "./token";
import type { ConsentInscriptionV1 } from "./schema";

export type ConsentProofBundle = {
  version: 1;
  generated_at: string;
  subject_identity_key: string;
  tokens: Array<{ outpoint: string; inscription: ConsentInscriptionV1 }>;
};

export async function buildProofBundle(
  wallet: BrowserWallet,
  filter?: { controller?: string },
): Promise<ConsentProofBundle> {
  const tokens = await listConsentTokens(wallet);
  const filtered = filter?.controller
    ? tokens.filter((t) => (t.data as ConsentInscriptionV1).controller === filter.controller)
    : tokens;
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    subject_identity_key: wallet.getIdentityKey(),
    tokens: filtered.map((t) => ({
      outpoint: t.outpoint,
      inscription: t.data as ConsentInscriptionV1,
    })),
  };
}

export function downloadBundle(bundle: ConsentProofBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consent-proof-${bundle.generated_at}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
