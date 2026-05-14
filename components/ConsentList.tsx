"use client";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { listConsentTokens, revokeConsentToken } from "@/lib/consent/token";
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

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No live consent tokens.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li
          key={r.outpoint}
          className="rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-zinc-500">{r.outpoint}</span>
              <span>
                <strong>Controller:</strong>{" "}
                <span className="font-mono">{r.data.controller.slice(0, 24)}…</span>
              </span>
              <span>
                <strong>Purposes:</strong> {r.data.purpose_ids.join(", ")}
              </span>
              <span>
                <strong>Issued:</strong> {r.data.issued_at}
              </span>
              {r.data.scope_expiry && (
                <span>
                  <strong>Expires:</strong> {r.data.scope_expiry}
                </span>
              )}
            </div>
            <button
              onClick={() => onRevoke(r.outpoint)}
              disabled={busy === r.outpoint}
              className="rounded-md border border-red-500 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === r.outpoint ? "Revoking…" : "Revoke"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
