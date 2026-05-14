import { Transaction } from "@bsv/sdk";
import type { Network } from "./chain";

const WOC_BASE = {
  main: "https://api.whatsonchain.com/v1/bsv/main",
  test: "https://api.whatsonchain.com/v1/bsv/test",
} as const;

export type DecodedInscription = {
  outputIndex: number;
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
    const found = scanScriptChunks(tx.outputs[i].lockingScript);
    if (found) inscriptions.push({ outputIndex: i, ...found });
  }

  return { txid, network, outputs: tx.outputs.length, inscriptions };
}

// Tolerant inscription scanner: walks every data push in the locking script
// and tries to parse it as JSON. If the parsed object looks like one of our
// consent schemas we return it. Avoids tight coupling to any one envelope
// format used by the underlying token library.
function scanScriptChunks(
  script: { chunks: Array<{ op: number; data?: number[] }> },
): { contentType: string; data: unknown } | null {
  for (const chunk of script.chunks) {
    if (!chunk.data || chunk.data.length < 10) continue;
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(chunk.data));
    } catch {
      continue;
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const type = typeof parsed.type === "string" ? parsed.type : null;
      if (type?.startsWith("gdpr-consent")) {
        return { contentType: "application/json", data: parsed };
      }
    } catch {
      continue;
    }
  }
  return null;
}
