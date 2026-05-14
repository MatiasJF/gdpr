"use client";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type DecodeResult = {
  txid: string;
  network: string;
  outputs: number;
  inscriptions: Array<{
    outputIndex: number;
    contentType: string;
    data: Record<string, unknown>;
    state: { exists: boolean; spent: boolean; spentBy?: string };
  }>;
};

export default function DecodePage() {
  const [txid, setTxid] = useState("");
  const [network, setNetwork] = useState<"main" | "test">("test");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decode = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/decode?txid=${encodeURIComponent(txid.trim())}&network=${network}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "decode failed");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Decode a consent token</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Paste any consent-token transaction ID. We fetch it from the public chain,
            extract the inscription, and show you exactly what was committed — no wallet
            required.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex flex-col gap-1 text-sm">
            Transaction ID
            <input
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
              placeholder="64-char hex txid"
              className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Network
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as "main" | "test")}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="test">testnet</option>
              <option value="main">mainnet</option>
            </select>
          </label>
          <button
            onClick={decode}
            disabled={busy || txid.length === 0}
            className="self-start rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
          >
            {busy ? "Decoding…" : "Decode"}
          </button>
          {error && (
            <p className="break-all rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </section>

        {result && <DecodeResultView result={result} />}
      </main>
      <SiteFooter />
    </>
  );
}

function DecodeResultView({ result }: { result: DecodeResult }) {
  if (result.inscriptions.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm">
          Transaction <span className="font-mono">{result.txid.slice(0, 12)}…</span> found on{" "}
          {result.network}, but no `gdpr-consent` inscription detected in its{" "}
          {result.outputs} outputs.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Inscriptions ({result.inscriptions.length})</h2>
      {result.inscriptions.map((i) => (
        <article
          key={i.outputIndex}
          className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <header className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs text-zinc-500">
              output #{i.outputIndex} · {i.contentType}
            </span>
            <StateBadge state={i.state} />
          </header>
          <KeyValueGrid data={i.data} />
          <details className="rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Raw inscription JSON
            </summary>
            <pre className="overflow-x-auto px-3 pb-3 text-xs">
              {JSON.stringify(i.data, null, 2)}
            </pre>
          </details>
        </article>
      ))}
    </section>
  );
}

function StateBadge({ state }: { state: { exists: boolean; spent: boolean; spentBy?: string } }) {
  if (!state.exists) {
    return <Badge tone="red">unknown</Badge>;
  }
  if (state.spent) {
    return <Badge tone="amber" title={state.spentBy}>revoked</Badge>;
  }
  return <Badge tone="emerald">live</Badge>;
}

function Badge({ tone, title, children }: { tone: "emerald" | "amber" | "red"; title?: string; children: React.ReactNode }) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  }[tone];
  return (
    <span title={title} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function KeyValueGrid({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 sm:pt-0.5">
            {k}
          </dt>
          <dd className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
