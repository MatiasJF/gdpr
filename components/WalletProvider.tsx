"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { createWallet, type BrowserWallet } from "@bsv/simple/browser";

type Ctx = {
  wallet: BrowserWallet | null;
  connect: () => Promise<void>;
  error: string | null;
  connecting: boolean;
};
const WalletCtx = createContext<Ctx | null>(null);

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    try {
      setError(null);
      setConnecting(true);
      const w = await createWallet({ didProxyUrl: "/api/resolve-did" });
      setWallet(w);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <WalletCtx.Provider value={{ wallet, connect, error, connecting }}>
      {children}
    </WalletCtx.Provider>
  );
}

export function WalletGate({ children }: { children: ReactNode }) {
  const { wallet, connect, error, connecting } = useWallet();
  if (wallet) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Connect a wallet to view and manage your consents.
      </p>
      <button
        onClick={connect}
        disabled={connecting}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function WalletStatus() {
  const { wallet } = useWallet();
  if (!wallet) return null;
  return (
    <p className="text-xs text-zinc-500">
      Wallet: <span className="font-mono">{wallet.getIdentityKey().slice(0, 16)}…</span> · {wallet.getAddress().slice(0, 12)}…
    </p>
  );
}
