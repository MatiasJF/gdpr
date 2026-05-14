import Link from "next/link";
import WalletProvider from "@/components/WalletProvider";
import ConsentList from "@/components/ConsentList";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">My consents</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          On-chain GDPR consent tokens issued to this wallet. Revocation is one click and
          publishes a verifiable on-chain record.
        </p>
        <Link
          href="/request"
          className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
        >
          Simulate a controller consent request →
        </Link>
      </header>
      <WalletProvider>
        <ConsentList />
      </WalletProvider>
    </main>
  );
}
