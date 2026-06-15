"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Record = {
  subject_pseudonym: string;
  controller: string;
  issued_at: string;
  erased_at: string | null;
  re_identifiable: boolean;
  subject_id_preview: string | null;
};

export default function ErasurePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/consent/erase");
      const json = await res.json();
      setRecords(json.records ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // Initial fetch of the controller's salt-store view.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const shred = async (pseudonym: string) => {
    setBusy(pseudonym);
    setError(null);
    try {
      const res = await fetch("/api/consent/erase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject_pseudonym: pseudonym }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "erasure failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Controller erasure — crypto-shredding
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          This is the controller&apos;s off-chain salt store: the only secret that
          links an on-chain pseudonym back to a real subject. Honouring an Article 17
          erasure means <strong>destroying the salt</strong>. The on-chain commitment
          is immutable and stays exactly where it is — but once the salt is gone,
          neither the controller nor anyone else can re-identify it. That is
          anonymisation-on-erasure, not deletion.
        </p>
        <Link
          href="/consents"
          className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          ← Back to my consents
        </Link>
      </header>

      {error && (
        <p className="break-all rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {records.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No consents issued yet. Grant one from the{" "}
          <Link href="/request" className="text-emerald-700 underline dark:text-emerald-400">
            controller request
          </Link>{" "}
          page or the Northgate cookie banner, then come back.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          {records.map((r) => (
            <article
              key={r.subject_pseudonym}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <header className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  {r.controller}
                </span>
                {r.re_identifiable ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    linkable to subject
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    anonymous (salt destroyed)
                  </span>
                )}
              </header>

              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  pseudonym
                </dt>
                <dd className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {r.subject_pseudonym}
                </dd>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  subject link
                </dt>
                <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {r.subject_id_preview ?? "— destroyed —"}
                </dd>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  issued
                </dt>
                <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {r.issued_at}
                </dd>
                {r.erased_at && (
                  <>
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      erased
                    </dt>
                    <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {r.erased_at}
                    </dd>
                  </>
                )}
              </dl>

              {r.re_identifiable && (
                <button
                  onClick={() => shred(r.subject_pseudonym)}
                  disabled={busy === r.subject_pseudonym}
                  className="self-start rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {busy === r.subject_pseudonym ? "Shredding…" : "Crypto-shred salt"}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
