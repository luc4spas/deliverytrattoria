import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, BadgePercent } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { brl } from "@/lib/format";
import { useTodaysAutoPromotion } from "@/hooks/use-promotions";
import type { RestaurantSettings } from "@/hooks/use-settings";

export function CartDrawer({
  settings,
  onCheckout,
}: {
  settings: RestaurantSettings | null;
  onCheckout: () => void;
}) {
  const { items, open, setOpen, setQty, remove, subtotal } = useCart();
  const { todayPromo } = useTodaysAutoPromotion();
  const minOrder = Number(settings?.min_order ?? 0);
  const belowMin = subtotal > 0 && subtotal < minOrder;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Seu pedido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-muted-foreground py-12">
              <div>
                <ShoppingBag className="size-10 mx-auto mb-3 opacity-40" />
                <p>Seu carrinho está vazio</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const key = item.lineId ?? item.productId;
                return (
                <li key={key} className="flex gap-3 rounded-xl border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    {item.meta?.kind === "pizza" && (
                      <div className="text-xs text-muted-foreground">
                        {item.meta.sizeName} ·{" "}
                        {item.meta.flavors.length === 1
                          ? item.meta.flavors[0].name
                          : item.meta.flavors
                              .map((f) => `${item.meta!.kind === "pizza" && item.meta!.flavors.length === 2 ? "½" : "⅓"} ${f.name}`)
                              .join(" · ")}
                        {item.meta.crust && item.meta.crust.price > 0 && ` · borda ${item.meta.crust.name}`}
                      </div>
                    )}
                    {item.meta?.kind === "combo" && (
                      <ul className="mt-1 space-y-0.5">
                        {item.meta.selections.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">{s.stepName}:</span>{" "}
                            {s.items
                              .map((it) => (it.sizeName ? `${it.name} (${it.sizeName})` : it.name))
                              .join(", ") || "—"}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.notes && (
                      <div className="text-xs text-muted-foreground truncate">Obs: {item.notes}</div>
                    )}
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {brl(item.price * item.quantity)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => remove(key)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <div className="flex items-center gap-1 border rounded-full p-0.5">
                      <button
                        onClick={() => setQty(key, item.quantity - 1)}
                        className="size-7 grid place-items-center rounded-full hover:bg-muted"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => setQty(key, item.quantity + 1)}
                        className="size-7 grid place-items-center rounded-full hover:bg-muted"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3 bg-muted/30">
            {todayPromo && (
              <div className="flex items-start gap-2 rounded-lg bg-success/10 border border-success/30 p-2.5 text-xs">
                <BadgePercent className="size-4 text-success-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{todayPromo.name}</div>
                  <div className="text-muted-foreground">
                    Desconto automático será aplicado no checkout.
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{brl(subtotal)}</span>
            </div>
            {belowMin && (
              <p className="text-xs text-warning-foreground bg-warning/20 rounded-md p-2">
                Pedido mínimo de {brl(minOrder)}. Faltam {brl(minOrder - subtotal)}.
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={belowMin || !settings?.is_open}
              onClick={onCheckout}
            >
              {settings?.is_open ? "Continuar pedido" : "Restaurante fechado"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
