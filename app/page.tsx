import Link from "next/link";
import ProductCard, { type Product } from "@/components/ProductCard";

const PRODUCTS: Product[] = [
  {
    name: "Reference Audio Monitor",
    category: "Audio",
    price: "€349",
    swatch: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  },
  {
    name: "Compact Mirrorless Body",
    category: "Cameras",
    price: "€1,299",
    swatch: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
  },
  {
    name: "Mechanical Keyboard, 75%",
    category: "Computing",
    price: "€189",
    swatch: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
  },
  {
    name: "Studio Headphones",
    category: "Audio",
    price: "€229",
    swatch: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
  },
  {
    name: "Wide-angle Prime Lens",
    category: "Cameras",
    price: "€699",
    swatch: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
  },
  {
    name: "USB-C Hub, Aluminium",
    category: "Accessories",
    price: "€89",
    swatch: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)",
  },
];

export default function MarketPage() {
  return (
    <main className="flex flex-col">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 sm:py-24">
          <span className="self-start rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Verifiable consent · powered by BSV
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Quality electronics, transparently sourced.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Every cookie you accept here is recorded as a 1Sat Ordinal in your own wallet.
            Withdrawing is one click — and the act is publicly auditable.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="mb-6 text-lg font-semibold">Featured</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.name} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">Curious what&apos;s recorded?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Every consent token is publicly decodable. Paste any txid — no wallet needed.
            </p>
          </div>
          <Link
            href="/decode"
            className="self-start rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-800"
          >
            Open decoder →
          </Link>
        </div>
      </section>
    </main>
  );
}
