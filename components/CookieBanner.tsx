"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "./WalletProvider";
import { issueConsentToken, listConsentTokens } from "@/lib/consent/token";
import {
  COOKIE_CATEGORIES,
  DEFAULT_SELECTION,
  NORTHGATE_CONTROLLER_DID,
  NORTHGATE_COOKIE_POLICY,
  isCookieConsent,
  selectionToPurposeIds,
  type CookieSelection,
} from "@/lib/consent/cookies";
import type { ConsentInscriptionV1 } from "@/lib/consent/schema";
import { hashPolicyClient } from "@/lib/consent/clientHash";

type Ctx = {
  visible: boolean;
  open: () => void;
  close: () => void;
};
const BannerCtx = createContext<Ctx | null>(null);

export function useCookieBanner() {
  const ctx = useContext(BannerCtx);
  if (!ctx) throw new Error("useCookieBanner must be used inside <CookieBannerProvider>");
  return ctx;
}

const STORAGE_KEY = "northgate.cookie.dismissed";

export function CookieBannerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selection, setSelection] = useState<CookieSelection>(DEFAULT_SELECTION);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { wallet, connect } = useWallet();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dismissed = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
      if (!wallet) {
        if (!dismissed) setVisible(true);
        return;
      }
      const tokens = await listConsentTokens(wallet);
      const live = tokens.find((t) => {
        const insc = t.data as ConsentInscriptionV1;
        return isCookieConsent(insc.controller, insc.purpose_ids);
      });
      if (!cancelled && !live && !dismissed) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const open = useCallback(() => {
    setVisible(true);
    setStatus(null);
  }, []);
  const close = useCallback(() => {
    setVisible(false);
    setCustomizeOpen(false);
  }, []);

  const persistDismissed = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  const grantWithSelection = async (sel: CookieSelection) => {
    setBusy(true);
    setStatus(null);
    try {
      if (!wallet) {
        await connect();
      }
      const activeWallet = wallet;
      if (!activeWallet) {
        setStatus("Connect a wallet to record consent on-chain.");
        return;
      }
      const subjectId = activeWallet.getIdentityKey();
      const inscription: ConsentInscriptionV1 = {
        type: "gdpr-consent-v1",
        controller: NORTHGATE_CONTROLLER_DID,
        subject_pseudonym: await hashPolicyClient(`${subjectId}|${NORTHGATE_CONTROLLER_DID}|northgate-salt`),
        purpose_ids: selectionToPurposeIds(sel),
        policy_hash: await hashPolicyClient(NORTHGATE_COOKIE_POLICY),
        issued_at: new Date().toISOString(),
        scope_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      };
      const minted = await issueConsentToken(activeWallet, inscription);
      setStatus(`Consent recorded: ${minted.txid}`);
      persistDismissed();
      setTimeout(() => close(), 1200);
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo(() => ({ visible, open, close }), [visible, open, close]);

  return (
    <BannerCtx.Provider value={value}>
      {children}
      {visible && (
        <>
          <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  We&apos;d like your consent
                </h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Northgate uses cookies for functionality, analytics, and advertising. Your
                  choice is recorded as a verifiable on-chain token in your own wallet — you
                  can withdraw it at any time.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                <button
                  onClick={() => {
                    persistDismissed();
                    close();
                  }}
                  disabled={busy}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Decline
                </button>
                <button
                  onClick={() => setCustomizeOpen(true)}
                  disabled={busy}
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Customise
                </button>
                <button
                  onClick={() => grantWithSelection({ functional: true, analytics: true, advertising: true })}
                  disabled={busy}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
                >
                  {busy ? "Recording…" : "Accept all"}
                </button>
              </div>
            </div>
            {status && (
              <p className="mt-3 break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {status}
              </p>
            )}
          </div>
          {customizeOpen && (
            <CustomizeModal
              selection={selection}
              setSelection={setSelection}
              busy={busy}
              onCancel={() => setCustomizeOpen(false)}
              onSave={() => grantWithSelection(selection)}
            />
          )}
        </>
      )}
    </BannerCtx.Provider>
  );
}

function CustomizeModal({
  selection,
  setSelection,
  busy,
  onCancel,
  onSave,
}: {
  selection: CookieSelection;
  setSelection: (s: CookieSelection) => void;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Customise cookie preferences
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Each category corresponds to a purpose ID recorded in your consent token.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {COOKIE_CATEGORIES.map((cat) => {
            const isReq = cat.required;
            const value = isReq
              ? true
              : (selection as Record<string, boolean>)[cat.id] ?? false;
            return (
              <li
                key={cat.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {cat.label}
                    {isReq && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Always on
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {cat.description}
                  </span>
                </div>
                <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={value}
                    disabled={isReq}
                    onChange={(e) =>
                      !isReq &&
                      setSelection({
                        ...selection,
                        [cat.id]: e.target.checked,
                      } as CookieSelection)
                    }
                  />
                  <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-emerald-500 peer-disabled:opacity-50 dark:bg-zinc-700" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
          >
            {busy ? "Recording…" : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
