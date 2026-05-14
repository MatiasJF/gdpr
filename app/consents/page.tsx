import Link from "next/link";
import ConsentList from "@/components/ConsentList";
import { WalletGate, WalletStatus } from "@/components/WalletProvider";

export default function ConsentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">My consents</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Every consent you have granted, as live on-chain tokens in your wallet.
          Revocation is one click and publishes a verifiable on-chain record.
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <Link
            href="/request"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Simulate a controller request →
          </Link>
          <Link
            href="/decode"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Decode a token →
          </Link>
        </div>
        <WalletStatus />
      </header>
      <WalletGate>
        <ConsentList />
      </WalletGate>
    </main>
  );
}
