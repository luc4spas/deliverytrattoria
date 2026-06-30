import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { brl } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useComboStructure } from "@/hooks/use-combo";
import { useProducts } from "@/hooks/use-menu";
import { usePizzaSizes, usePizzaFlavorPrices } from "@/hooks/use-pizza";
import type { Product } from "@/hooks/use-menu";
import { toast } from "sonner";

type ItemKey = string; // `${stepId}:${itemId}`

export function ComboBuilder({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: structure, isLoading } = useComboStructure(product?.id);
  const { data: products = [] } = useProducts();
  const { data: sizes = [] } = usePizzaSizes();
  const { data: flavorPrices = [] } = usePizzaFlavorPrices();
  const { add } = useCart();
  const [picks, setPicks] = useState<Record<string, ItemKey[]>>({});

  useEffect(() => {
    if (open) setPicks({});
  }, [open, product?.id]);

  const productById = useMemo(() => {
    const m: Record<string, Product> = {};
    products.forEach((p) => (m[p.id] = p));
    return m;
  }, [products]);

  const sizeById = useMemo(() => {
    const m: Record<string, { name: string }> = {};
    sizes.forEach((s) => (m[s.id] = { name: s.name }));
    return m;
  }, [sizes]);

  const refPrice = (productId: string, sizeId: string | null, extra: number) => {
    if (sizeId) {
      const fp = flavorPrices.find(
        (f) => f.product_id === productId && f.size_id === sizeId,
      );
      return Number(fp?.price ?? 0) + Number(extra ?? 0);
    }
    const p = productById[productId];
    return Number(p?.price ?? 0) + Number(extra ?? 0);
  };

  if (!product) return null;

  const steps = structure?.steps ?? [];
  const allValid = steps.every(
    (s) => (picks[s.id]?.length ?? 0) >= s.min_choices,
  );

  // sum of cheapest reference for each required slot — conservative "preço cheio"
  const originalSum = steps.reduce((acc, s) => {
    if (!s.items.length) return acc;
    const prices = s.items.map((i) => refPrice(i.product_id, i.size_id, Number(i.extra_price)));
    prices.sort((a, b) => a - b);
    const required = Math.max(s.min_choices, 0);
    const slot = prices.slice(0, Math.min(required, prices.length));
    // if fewer options than required, pad with cheapest
    while (slot.length < required) slot.push(prices[0] ?? 0);
    return acc + slot.reduce((a, b) => a + b, 0);
  }, 0);

  const comboPrice = Number(product.price);
  const showDiscount = originalSum > comboPrice + 0.01;
  const savings = originalSum - comboPrice;

  const toggle = (stepId: string, itemId: string, max: number) => {
    setPicks((prev) => {
      const current = prev[stepId] ?? [];
      const has = current.includes(itemId);
      let next: string[];
      if (has) next = current.filter((x) => x !== itemId);
      else if (max === 1) next = [itemId];
      else if (current.length >= max) {
        toast.error(`Máximo de ${max} escolha(s) nesta etapa`);
        return prev;
      } else next = [...current, itemId];
      return { ...prev, [stepId]: next };
    });
  };

  const handleAdd = () => {
    if (!allValid) {
      toast.error("Complete as escolhas obrigatórias do combo");
      return;
    }
    const selections = steps.map((s) => ({
      stepName: s.name,
      items: (picks[s.id] ?? [])
        .map((id) => s.items.find((it) => it.id === id))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((it) => ({
          name: productById[it.product_id]?.name ?? "Item",
          sizeName: it.size_id ? sizeById[it.size_id]?.name ?? null : null,
        })),
    }));

    add({
      productId: product.id,
      name: product.name,
      price: comboPrice,
      image_url: product.image_url,
      quantity: 1,
      meta: { kind: "combo", selections },
    });
    toast.success(`${product.name} adicionado`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 max-h-[92vh] flex flex-col">
        <div className="relative">
          {product.image_url ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img src={product.image_url} alt={product.name} className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1">
                <Sparkles className="size-3" /> COMBO
              </span>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold drop-shadow">
                    {product.name}
                  </DialogTitle>
                </DialogHeader>
                {product.description && (
                  <p className="text-sm opacity-90 mt-1 line-clamp-2">{product.description}</p>
                )}
              </div>
            </div>
          ) : (
            <DialogHeader className="p-5 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> {product.name}
              </DialogTitle>
            </DialogHeader>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Este combo ainda não tem etapas configuradas.
            </p>
          ) : (
            steps.map((step) => {
              const selected = picks[step.id] ?? [];
              const need = step.min_choices;
              const max = step.max_choices;
              const ok = selected.length >= need;
              return (
                <div key={step.id} className="rounded-xl border overflow-hidden">
                  <div className="flex items-center justify-between gap-2 p-3 bg-muted/50">
                    <div>
                      <div className="font-semibold text-sm">{step.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {need === max
                          ? `Escolha ${need}`
                          : `Escolha de ${need} a ${max}`}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-1 ${
                        ok
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {ok ? "Ok" : "Obrigatório"}
                    </span>
                  </div>
                  <div className="divide-y">
                    {step.items.length === 0 && (
                      <div className="p-3 text-xs text-muted-foreground">
                        Nenhuma opção cadastrada.
                      </div>
                    )}
                    {step.items.map((it) => {
                      const p = productById[it.product_id];
                      if (!p) return null;
                      const sizeName = it.size_id ? sizeById[it.size_id]?.name : null;
                      const isSel = selected.includes(it.id);
                      const extra = Number(it.extra_price ?? 0);
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => toggle(step.id, it.id, max)}
                          className={`w-full flex items-center gap-3 p-3 text-left transition ${
                            isSel ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="size-12 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="size-12 rounded-lg bg-muted shrink-0 grid place-items-center text-lg">
                              🍽️
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {sizeName ? `${sizeName}` : "Incluso"}
                              {extra > 0 && ` · +${brl(extra)}`}
                            </div>
                          </div>
                          <span
                            className={`size-6 rounded-full border-2 grid place-items-center shrink-0 ${
                              isSel
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {isSel && <Check className="size-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t p-4 bg-background space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Preço do combo
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-primary">{brl(comboPrice)}</span>
                {showDiscount && (
                  <span className="text-sm line-through text-muted-foreground">
                    {brl(originalSum)}
                  </span>
                )}
              </div>
              {showDiscount && (
                <div className="text-xs font-semibold text-primary">
                  Você economiza {brl(savings)}
                </div>
              )}
            </div>
            <Button size="lg" disabled={!allValid} onClick={handleAdd}>
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
