"use client";
import { useCookieBanner } from "./CookieBanner";

export default function SiteFooter() {
  const { open } = useCookieBanner();
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
        <span>Northgate — Demo PoC. Internal tier. © {new Date().getFullYear()}.</span>
        <button
          onClick={open}
          className="rounded-md px-2 py-1 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          Manage cookie preferences
        </button>
      </div>
    </footer>
  );
}
