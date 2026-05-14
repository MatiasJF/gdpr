const WOC_BASE = {
  main: "https://api.whatsonchain.com/v1/bsv/main",
  test: "https://api.whatsonchain.com/v1/bsv/test",
} as const;

export type Network = keyof typeof WOC_BASE;

export type OutpointState = {
  outpoint: string;
  exists: boolean;
  spent: boolean;
  spentBy?: string;
};

export async function checkOutpointState(
  network: Network,
  outpoint: string,
): Promise<OutpointState> {
  const [txid, voutStr] = outpoint.split(".");
  const vout = Number(voutStr);
  if (!txid || Number.isNaN(vout)) {
    return { outpoint, exists: false, spent: false };
  }

  const base = WOC_BASE[network];

  const txRes = await fetch(`${base}/tx/hash/${txid}`);
  if (txRes.status === 404) return { outpoint, exists: false, spent: false };
  if (!txRes.ok) throw new Error(`WoC tx lookup failed: ${txRes.status}`);

  const spentRes = await fetch(`${base}/tx/${txid}/out/${vout}/spent`);
  if (spentRes.status === 404) return { outpoint, exists: true, spent: false };
  if (!spentRes.ok) {
    throw new Error(`WoC spent lookup failed: ${spentRes.status}`);
  }
  const spentData = (await spentRes.json()) as { txid?: string };
  return { outpoint, exists: true, spent: true, spentBy: spentData.txid };
}
