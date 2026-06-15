import type { Network } from "./chain";

// The @bsv/simple wallet reports its network as 'main' | 'testnet', but the
// decoder API and WhatsOnChain paths use 'main' | 'test'. Normalise here.
export function toChainNetwork(walletNetwork: string | undefined): Network {
  return walletNetwork === "main" ? "main" : "test";
}

export function wocTxUrl(network: Network, txid: string): string {
  const host = network === "main" ? "https://whatsonchain.com" : "https://test.whatsonchain.com";
  return `${host}/tx/${txid}`;
}

export function decodeUrl(network: Network, txid: string): string {
  return `/decode?txid=${txid}&network=${network}`;
}
