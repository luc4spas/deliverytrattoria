import { brl } from "@/lib/format";
import type { Product } from "@/hooks/use-menu";

export function ProductCard({
  product,
  onClick,
  hidePrice = false,
}: {
  product: Product;
  onClick: () => void;
  hidePrice?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!product.is_available}
      className="group w-full text-left rounded-2xl border bg-card p-3 flex gap-3 transition hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold leading-tight truncate">{product.name}</h3>
        {product.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {hidePrice ? (
            <span className="text-xs font-medium text-primary">Toque para montar →</span>
          ) : (
            <span className="font-bold text-primary">{brl(Number(product.price))}</span>
          )}
          {!product.is_available && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Indisponível
            </span>
          )}
        </div>
      </div>
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="size-24 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="size-24 rounded-xl bg-muted shrink-0 grid place-items-center text-muted-foreground text-2xl">
          🍽️
        </div>
      )}
    </button>
  );
}
