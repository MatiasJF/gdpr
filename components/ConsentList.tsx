"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import {
  listConsentTokens,
  listRevokedConsents,
  revokeConsentToken,
  type LiveConsent,
  type RevokedConsent,
} from "@/lib/consent/token";
import { buildProofBundle, downloadBundle } from "@/lib/consent/proof";

type Tab = "live" | "revoked";

type Toast = { revocationTxid: string; consentOutpoint: string } | null;

export default function ConsentList() {
  const { wallet } = useWallet();
  const [tab, setTab] = useState<Tab>("live");
  const [live, setLive] = useState<LiveConsent[]>([]);
  const [revoked, setRevoked] = useState<RevokedConsent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const [l, r] = await Promise.all([
      listConsentTokens(wallet),
      listRevokedConsents(wallet),
    ]);
    setLive(l);
    setRevoked(r);
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRevoke = async (outpoint: string) => {
    if (!wallet) return;
    setBusy(outpoint);
    try {
      const result = await revokeConsentToken(wallet, outpoint);
      setToast({ revocationTxid: result.txid, consentOutpoint: outpoint });
      await refresh();
      setTab("revoked");
    } finally {
      setBusy(null);
    }
  };

  const onExport = async () => {
    if (!wallet) return;
    const bundle = await buildProofBundle(wallet);
    downloadBundle(bundle);
  };

  return (
    <section className="flex flex-col gap-4">
      {toast && (
        <RevocationToast
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex">
          <TabButton active={tab === "live"} onClick={() => setTab("live")}>
            Live <Pill>{live.length}</Pill>
          </TabButton>
          <TabButton active={tab === "revoked"} onClick={() => setTab("revoked")}>
            Revoked <Pill>{revoked.length}</Pill>
          </TabButton>
        </div>
        {tab === "live" && live.length > 0 && (
          <button
            onClick={onExport}
            className="mb-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Download proof bundle
          </button>
        )}
      </div>

      {tab === "live" ? (
        <LiveList rows={live} busy={busy} onRevoke={onRevoke} />
      ) : (
        <RevokedList rows={revoked} />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-emerald-500 text-zinc-900 dark:text-zinc-50"
          : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

function RevocationToast({
  toast,
  onDismiss,
}: {
  toast: NonNullable<Toast>;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <strong className="text-emerald-900 dark:text-emerald-200">
            Consent revoked on chain.
          </strong>
          <span className="text-xs text-emerald-800 dark:text-emerald-300">
            The revocation inscription is publicly verifiable.
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono break-all text-emerald-900 dark:text-emerald-200">
          tx: {toast.revocationTxid}
        </span>
        <Link
          href={`/decode?txid=${toast.revocationTxid}`}
          className="rounded-md border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
        >
          Decode →
        </Link>
        <a
          href={`https://whatsonchain.com/tx/${toast.revocationTxid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
        >
          WoC ↗
        </a>
      </div>
    </div>
  );
}

function LiveList({
  rows,
  busy,
  onRevoke,
}: {
  rows: LiveConsent[];
  busy: string | null;
  onRevoke: (outpoint: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No live consent tokens. Visit the market or simulate a request to grant one.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const txid = r.outpoint.split(".")[0];
        return (
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
                {r.data.scope_expiry && <Detail label="Expires" value={r.data.scope_expiry} />}
                <div className="mt-1 flex gap-2 text-xs">
                  <Link
                    href={`/decode?txid=${txid}`}
                    className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                  >
                    Decode
                  </Link>
                  <a
                    href={`https://whatsonchain.com/tx/${txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                  >
                    WoC ↗
                  </a>
                </div>
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
        );
      })}
    </ul>
  );
}

function RevokedList({ rows }: { rows: RevokedConsent[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No revocations recorded yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const revocationTxid = r.revocationOutpoint.split(".")[0];
        const consentTxid = r.consentOutpoint.split(".")[0];
        return (
          <li
            key={r.revocationOutpoint}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  revoked
                </span>
                <span className="text-xs text-zinc-500">
                  on {r.revocationData.revoked_at}
                </span>
              </div>
              {r.consentData ? (
                <>
                  <Detail label="Controller" value={r.consentData.controller} mono />
                  <Detail label="Purposes" value={r.consentData.purpose_ids.join(", ")} />
                  <Detail label="Issued" value={r.consentData.issued_at} />
                </>
              ) : (
                <Detail
                  label="Original"
                  value="not in this wallet's basket — proof bundle would still verify"
                />
              )}
              <Detail label="Consent outpoint" value={r.consentOutpoint} mono />
              <Detail label="Revocation outpoint" value={r.revocationOutpoint} mono />
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link
                  href={`/decode?txid=${revocationTxid}`}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  Decode revocation
                </Link>
                <Link
                  href={`/decode?txid=${consentTxid}`}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  Decode original
                </Link>
                <a
                  href={`https://whatsonchain.com/tx/${revocationTxid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  WoC ↗
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}
