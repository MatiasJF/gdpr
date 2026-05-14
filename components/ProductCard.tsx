export type Product = {
  name: string;
  category: string;
  price: string;
  swatch: string;
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="aspect-[4/3] w-full transition-transform group-hover:scale-[1.02]"
        style={{ background: product.swatch }}
      />
      <div className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {product.category}
        </span>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {product.name}
        </h3>
        <span className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {product.price}
        </span>
      </div>
    </article>
  );
}
