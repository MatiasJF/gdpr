"use client";
import { useState } from "react";
import Link from "next/link";
import WalletProvider, { useWallet } from "@/components/WalletProvider";
import { issueConsentToken } from "@/lib/consent/token";
import type { ConsentInscriptionV1 } from "@/lib/consent/schema";

const DEFAULT_CONTROLLER = "did:bsv:demo-controller";
const DEFAULT_POLICY = `Acme Corp will use the data you provide solely for the purposes listed below.
You may withdraw consent at any time by revoking the consent token in your wallet.`;
const DEFAULT_PURPOSES = ["marketing-email", "analytics"];

function GrantForm() {
  const { wallet } = useWallet();
  const [controller, setController] = useState(DEFAULT_CONTROLLER);
  const [policyText, setPolicyText] = useState(DEFAULT_POLICY);
  const [purposes, setPurposes] = useState(DEFAULT_PURPOSES.join(","));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grant = async () => {
    if (!wallet) return;
    setBusy(true);
    setStatus(null);
    try {
      const envelopeRes = await fetch("/api/consent/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          controller,
          purpose_ids: purposes.split(",").map((s) => s.trim()).filter(Boolean),
          policy_text: policyText,
        }),
      });
      const envelope = await envelopeRes.json();

      const subjectId = wallet.getIdentityKey();
      const inscription: ConsentInscriptionV1 = {
        type: "gdpr-consent-v1",
        controller: envelope.controller,
        subject_pseudonym: await sha256Hex(`${subjectId}|${envelope.controller}|poc-salt`),
        purpose_ids: envelope.purpose_ids,
        policy_hash: envelope.policy_hash,
        issued_at: new Date().toISOString(),
        scope_expiry: envelope.scope_expiry ?? null,
      };

      const minted = await issueConsentToken(wallet, inscription);
      setStatus(`Token minted: ${minted.txid}`);
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Controller DID
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
          value={controller}
          onChange={(e) => setController(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Purposes (comma-separated IDs)
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
          value={purposes}
          onChange={(e) => setPurposes(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Policy text (only its hash goes on-chain)
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
        />
      </label>
      <button
        onClick={grant}
        disabled={busy}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {busy ? "Granting…" : "Grant consent"}
      </button>
      {status && <p className="font-mono text-xs">{status}</p>}
    </div>
  );
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function RequestPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Controller consent request</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Simulates a controller asking the data subject for consent. The user reviews the
          envelope, then mints a 1Sat Ordinal consent token into their own wallet.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
        >
          ← Back to my consents
        </Link>
      </header>
      <WalletProvider>
        <GrantForm />
      </WalletProvider>
    </main>
  );
}
