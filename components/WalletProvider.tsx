"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { createWallet, type BrowserWallet } from "@bsv/simple/browser";

type Ctx = { wallet: BrowserWallet | null; connect: () => Promise<void>; error: string | null };
const WalletCtx = createContext<Ctx | null>(null);

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    try {
      setError(null);
      const w = await createWallet({ didProxyUrl: "/api/resolve-did" });
      setWallet(w);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <WalletCtx.Provider value={{ wallet, connect, error }}>
      {wallet ? (
        children
      ) : (
        <div className="flex flex-col items-center gap-3 py-12">
          <button
            onClick={connect}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Connect wallet
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </WalletCtx.Provider>
  );
}
