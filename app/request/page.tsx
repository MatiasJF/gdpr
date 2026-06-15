"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet, WalletGate, WalletStatus } from "@/components/WalletProvider";
import { issueConsentToken } from "@/lib/consent/token";
import type { ConsentInscriptionV1 } from "@/lib/consent/schema";

const DEFAULT_CONTROLLER = "did:bsv:demo-controller";
const DEFAULT_POLICY = `Acme Corp will use the data you provide solely for the purposes listed below.
You may withdraw consent at any time by revoking the consent token in your wallet.`;
const DEFAULT_PURPOSES = "marketing-email,analytics";

function GrantForm() {
  const { wallet } = useWallet();
  const [controller, setController] = useState(DEFAULT_CONTROLLER);
  const [policyText, setPolicyText] = useState(DEFAULT_POLICY);
  const [purposes, setPurposes] = useState(DEFAULT_PURPOSES);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grant = async () => {
    if (!wallet) return;
    setBusy(true);
    setStatus(null);
    try {
      const subjectId = wallet.getIdentityKey();
      const envelopeRes = await fetch("/api/consent/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          controller,
          purpose_ids: purposes.split(",").map((s) => s.trim()).filter(Boolean),
          policy_text: policyText,
          subject_id: subjectId,
        }),
      });
      const envelope = await envelopeRes.json();

      // The pseudonym is derived controller-side from a random per-consent salt
      // held off-chain; the client just carries it onto the chain.
      const inscription: ConsentInscriptionV1 = {
        type: "gdpr-consent-v1",
        controller: envelope.controller,
        subject_pseudonym: envelope.subject_pseudonym,
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
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Controller DID
        <input
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          value={controller}
          onChange={(e) => setController(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Purposes (comma-separated IDs)
        <input
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          value={purposes}
          onChange={(e) => setPurposes(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Policy text
        <span className="text-xs font-normal text-zinc-500">
          Only its SHA-256 hash goes on-chain.
        </span>
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
        />
      </label>
      <div className="flex items-center justify-between">
        <WalletStatus />
        <button
          onClick={grant}
          disabled={busy}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy ? "Granting…" : "Grant consent"}
        </button>
      </div>
      {status && (
        <p className="break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs dark:bg-zinc-950">
          {status}
        </p>
      )}
    </section>
  );
}

export default function RequestPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Controller consent request</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Simulates a controller asking the data subject for consent. The user reviews the
          envelope, then mints a 1Sat Ordinal consent token into their own wallet.
        </p>
        <Link
          href="/consents"
          className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          ← Back to my consents
        </Link>
      </header>
      <WalletGate>
        <GrantForm />
      </WalletGate>
    </main>
  );
}
