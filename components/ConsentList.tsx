"use client";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { listConsentTokens, revokeConsentToken } from "@/lib/consent/token";
import { buildProofBundle, downloadBundle } from "@/lib/consent/proof";
import type { ConsentInscriptionV1 } from "@/lib/consent/schema";

type Row = { outpoint: string; data: ConsentInscriptionV1 };

export default function ConsentList() {
  const { wallet } = useWallet();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const tokens = await listConsentTokens(wallet);
    setRows(
      tokens.map((t) => ({
        outpoint: t.outpoint,
        data: t.data as ConsentInscriptionV1,
      })),
    );
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRevoke = async (outpoint: string) => {
    if (!wallet) return;
    setBusy(outpoint);
    try {
      await revokeConsentToken(wallet, outpoint);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const onExport = async () => {
    if (!wallet) return;
    const bundle = await buildProofBundle(wallet);
    downloadBundle(bundle);
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No live consent tokens. Visit the market or simulate a request to grant one.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{rows.length} live</span>
        <button
          onClick={onExport}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Download proof bundle
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.outpoint}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="break-all font-mono text-xs text-zinc-500">
                  {r.outpoint}
                </span>
                <Detail label="Controller" value={r.data.controller} mono />
                <Detail label="Purposes" value={r.data.purpose_ids.join(", ")} />
                <Detail label="Issued" value={r.data.issued_at} />
                {r.data.scope_expiry && (
                  <Detail label="Expires" value={r.data.scope_expiry} />
                )}
              </div>
              <button
                onClick={() => onRevoke(r.outpoint)}
                disabled={busy === r.outpoint}
                className="self-start rounded-md border border-red-500 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:bg-zinc-900 dark:hover:bg-red-950/40"
              >
                {busy === r.outpoint ? "Revoking…" : "Revoke"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}
