import { Transaction } from "@bsv/sdk";
import type { Network } from "./chain";
import { parseScriptForConsent } from "./parseInscription";

const WOC_BASE = {
  main: "https://api.whatsonchain.com/v1/bsv/main",
  test: "https://api.whatsonchain.com/v1/bsv/test",
} as const;

export type DecodedInscription = {
  outputIndex: number;
  kind: "consent" | "revocation" | "other";
  contentType: string;
  data: unknown;
};

export type DecodedTransaction = {
  txid: string;
  network: Network;
  outputs: number;
  inscriptions: DecodedInscription[];
};

export async function decodeTransaction(
  network: Network,
  txid: string,
): Promise<DecodedTransaction> {
  const base = WOC_BASE[network];
  const hexRes = await fetch(`${base}/tx/${txid}/hex`);
  if (!hexRes.ok) {
    throw new Error(`Transaction ${txid} not found on ${network} (status ${hexRes.status})`);
  }
  const hex = (await hexRes.text()).trim();
  const tx = Transaction.fromHex(hex);

  const inscriptions: DecodedInscription[] = [];
  for (let i = 0; i < tx.outputs.length; i++) {
    const scriptHex = tx.outputs[i].lockingScript.toHex();
    const parsed = parseScriptForConsent(scriptHex);
    if (parsed) {
      inscriptions.push({
        outputIndex: i,
        kind: parsed.kind,
        contentType: "application/json",
        data: parsed.raw,
      });
    }
  }

  return { txid, network, outputs: tx.outputs.length, inscriptions };
}
