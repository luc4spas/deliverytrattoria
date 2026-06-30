import { Sparkles } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product } from "@/hooks/use-menu";
import { useComboStructure } from "@/hooks/use-combo";
import { useProducts } from "@/hooks/use-menu";
import { usePizzaFlavorPrices } from "@/hooks/use-pizza";

type ComboItem = { name: string; qty: number; note?: string };

export function ComboCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const items = (Array.isArray((product as any).combo_items)
    ? ((product as any).combo_items as ComboItem[])
    : []) as ComboItem[];

  const { data: structure } = useComboStructure(product.id);
  const { data: products = [] } = useProducts();
  const { data: flavorPrices = [] } = usePizzaFlavorPrices();

  const refPrice = (productId: string, sizeId: string | null, extra: number) => {
    if (sizeId) {
      const fp = flavorPrices.find(
        (f) => f.product_id === productId && f.size_id === sizeId,
      );
      return Number(fp?.price ?? 0) + Number(extra ?? 0);
    }
    const p = products.find((x) => x.id === productId);
    return Number(p?.price ?? 0) + Number(extra ?? 0);
  };

  const originalSum = (structure?.steps ?? []).reduce((acc, s) => {
    if (!s.items.length) return acc;
    const prices = s.items
      .map((i) => refPrice(i.product_id, i.size_id, Number(i.extra_price)))
      .sort((a, b) => a - b);
    const required = Math.max(s.min_choices, 0);
    const slot = prices.slice(0, Math.min(required, prices.length));
    while (slot.length < required) slot.push(prices[0] ?? 0);
    return acc + slot.reduce((a, b) => a + b, 0);
  }, 0);

  const comboPrice = Number(product.price);
  const showDiscount = originalSum > comboPrice + 0.01;
  const discountPct = showDiscount
    ? Math.round(((originalSum - comboPrice) / originalSum) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      disabled={!product.is_available}
      className="group relative w-full text-left rounded-2xl overflow-hidden border bg-card transition hover:shadow-lg disabled:opacity-50"
    >
      {product.image_url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="size-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1">
            <Sparkles className="size-3" /> COMBO
          </span>
          {showDiscount && (
            <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-yellow-400 text-black text-xs font-bold px-2.5 py-1 shadow">
              -{discountPct}%
            </span>
          )}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
            {product.description && (
              <p className="text-xs opacity-90 line-clamp-1 mt-0.5">{product.description}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-bold">{product.name}</h3>
        </div>
      )}

      <div className="p-3 space-y-2">
        {items.length > 0 && (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i} className="text-sm flex items-baseline gap-1.5">
                <span className="font-semibold text-primary">{it.qty}x</span>
                <span className="text-foreground/90">{it.name}</span>
                {it.note && <span className="text-xs text-muted-foreground">· {it.note}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Preço promocional
            </div>
            {showDiscount && (
              <div className="text-xs line-through text-muted-foreground">{brl(originalSum)}</div>
            )}
          </div>
          <span className="font-extrabold text-primary text-xl">{brl(comboPrice)}</span>
        </div>
      </div>
    </button>
  );
}
