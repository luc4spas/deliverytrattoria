import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";
import { brl } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import {
  usePizzaCrusts,
  usePizzaFlavorPrices,
  usePizzaSizes,
  type PizzaSize,
} from "@/hooks/use-pizza";
import type { Product } from "@/hooks/use-menu";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;

export type FlavorGroup = {
  id: string;
  label: string; // ex: "Salgadas", "Doces"
  flavors: Product[];
};

export function PizzaBuilder({
  open,
  onOpenChange,
  flavorGroups,
  initialFlavorId = null,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flavorGroups: FlavorGroup[];
  initialFlavorId?: string | null;
}) {
  const { data: sizes = [] } = usePizzaSizes(true);
  const { data: crusts = [] } = usePizzaCrusts(true);
  const { data: prices = [] } = usePizzaFlavorPrices();
  const { add, setOpen: setCartOpen } = useCart();

  const [step, setStep] = useState<Step>(1);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [crustId, setCrustId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);

  const allFlavors = useMemo(
    () => flavorGroups.flatMap((g) => g.flavors),
    [flavorGroups]
  );

  const size = useMemo<PizzaSize | null>(
    () => sizes.find((s) => s.id === sizeId) ?? null,
    [sizes, sizeId]
  );

  const reset = () => {
    setStep(1);
    setSizeId(null);
    setFlavorIds(initialFlavorId ? [initialFlavorId] : []);
    setCrustId(null);
    setNotes("");
    setQty(1);
    setActiveGroupId(
      initialFlavorId
        ? flavorGroups.find((g) => g.flavors.some((f) => f.id === initialFlavorId))?.id ?? null
        : null
    );
  };

  // Sync preselected flavor whenever the dialog opens (or the preselection changes)
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSizeId(null);
    setCrustId(null);
    setNotes("");
    setQty(1);
    setFlavorIds(initialFlavorId ? [initialFlavorId] : []);
    setActiveGroupId(
      initialFlavorId
        ? flavorGroups.find((g) => g.flavors.some((f) => f.id === initialFlavorId))?.id ?? null
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFlavorId]);

  const priceOf = (flavorId: string, sid: string) =>
    Number(prices.find((p) => p.product_id === flavorId && p.size_id === sid)?.price ?? 0);

  const flavorsPriceMax = useMemo(() => {
    if (!size) return 0;
    return flavorIds.reduce((m, id) => Math.max(m, priceOf(id, size.id)), 0);
  }, [flavorIds, size, prices]);

  const crust = crusts.find((c) => c.id === crustId) ?? null;
  const unitPrice = flavorsPriceMax + Number(crust?.price ?? 0);
  const total = unitPrice * qty;

  const toggleFlavor = (id: string) => {
    if (!size) return;
    setFlavorIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= size.max_flavors) {
        toast.message(`Esse tamanho aceita até ${size.max_flavors} sabor(es).`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const canNext =
    (step === 1 && !!sizeId) ||
    (step === 2 && flavorIds.length >= 1) ||
    step === 3 ||
    step === 4;

  const onClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleAdd = () => {
    if (!size || flavorIds.length === 0) return;
    const flavorObjs = flavorIds.map((id) => {
      const f = allFlavors.find((p) => p.id === id)!;
      return { id: f.id, name: f.name };
    });
    const label =
      flavorObjs.length === 1
        ? `Pizza ${size.name} ${flavorObjs[0].name}`
        : `Pizza ${size.name} — ${flavorObjs.map((f) => f.name).join(" / ")}`;
    add({
      productId: flavorIds[0],
      name: label,
      price: unitPrice,
      image_url: allFlavors.find((f) => f.id === flavorIds[0])?.image_url ?? null,
      quantity: qty,
      notes: notes.trim() || undefined,
      meta: {
        kind: "pizza",
        sizeId: size.id,
        sizeName: size.name,
        slices: size.slices,
        flavors: flavorObjs,
        crust: crust ? { id: crust.id, name: crust.name, price: Number(crust.price) } : null,
      },
    });
    toast.success("Pizza adicionada ao carrinho");
    onOpenChange(false);
    reset();
    setCartOpen(true);
  };

  // Default active group for tabs
  const activeGroup =
    flavorGroups.find((g) => g.id === activeGroupId) ?? flavorGroups[0] ?? null;

  const visibleFlavors = activeGroup?.flavors ?? allFlavors;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[92vh] flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as Step)} className="p-1 -ml-1 rounded hover:bg-muted">
                <ChevronLeft className="size-5" />
              </button>
            )}
            <DialogTitle className="text-base">
              {step === 1 && "Escolha o tamanho"}
              {step === 2 && `Escolha até ${size?.max_flavors ?? 1} sabor${(size?.max_flavors ?? 1) > 1 ? "es" : ""}`}
              {step === 3 && "Escolha a borda"}
              {step === 4 && "Resumo do pedido"}
            </DialogTitle>
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* STEP 1: SIZE */}
          {step === 1 && (
            <div className="grid gap-2">
              {sizes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum tamanho cadastrado. Configure em Admin → Pizzas.
                </p>
              )}
              {sizes.map((s) => {
                const cheapest = allFlavors.length
                  ? Math.min(
                      ...allFlavors
                        .map((f) => priceOf(f.id, s.id))
                        .filter((p) => p > 0)
                    )
                  : 0;
                const selected = sizeId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={`text-left rounded-xl border p-4 transition ${
                      selected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.slices} fatias · até {s.max_flavors} sabor{s.max_flavors > 1 ? "es" : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        {Number.isFinite(cheapest) && cheapest > 0 && (
                          <div className="text-xs text-muted-foreground">a partir de</div>
                        )}
                        <div className="font-semibold text-primary">
                          {Number.isFinite(cheapest) && cheapest > 0 ? brl(cheapest) : "—"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: FLAVORS */}
          {step === 2 && size && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {flavorIds.length} de {size.max_flavors} selecionado{flavorIds.length === 1 ? "" : "s"}.
                Pode misturar doce e salgado — o preço é o do sabor mais caro.
              </div>

              {flavorGroups.length > 1 && (
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  {flavorGroups.map((g) => {
                    const selectedInGroup = g.flavors.filter((f) => flavorIds.includes(f.id)).length;
                    const isActive = (activeGroup?.id ?? flavorGroups[0]?.id) === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setActiveGroupId(g.id)}
                        className={`flex-1 text-sm font-medium rounded-md px-3 py-1.5 transition ${
                          isActive ? "bg-background shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        {g.label}
                        {selectedInGroup > 0 && (
                          <span className="ml-1.5 text-xs text-primary">({selectedInGroup})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-2">
                {visibleFlavors.map((f) => {
                  const p = priceOf(f.id, size.id);
                  const selected = flavorIds.includes(f.id);
                  const disabled = !selected && flavorIds.length >= size.max_flavors;
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFlavor(f.id)}
                      disabled={disabled || p === 0}
                      className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${
                        selected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
                      } disabled:opacity-40`}
                    >
                      {f.image_url ? (
                        <img src={f.image_url} alt="" className="size-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="size-14 rounded-lg bg-muted grid place-items-center text-xl">🍕</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{f.name}</div>
                        {f.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{f.description}</div>
                        )}
                        <div className="text-xs mt-0.5">
                          {p > 0 ? brl(p) : <span className="text-muted-foreground">indisponível neste tamanho</span>}
                        </div>
                      </div>
                      {selected && (
                        <div className="size-6 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                          <Check className="size-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CRUST */}
          {step === 3 && (
            <div className="grid gap-2">
              <button
                onClick={() => setCrustId(null)}
                className={`flex items-center justify-between rounded-xl border p-4 transition ${
                  crustId === null ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
                }`}
              >
                <span className="font-medium">Sem borda recheada</span>
                <span className="text-sm text-muted-foreground">Grátis</span>
              </button>
              {crusts.filter((c) => Number(c.price) > 0).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCrustId(c.id)}
                  className={`flex items-center justify-between rounded-xl border p-4 transition ${
                    crustId === c.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-primary font-semibold">+ {brl(Number(c.price))}</span>
                </button>
              ))}
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && size && (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">Pizza {size.name}</div>
                <div className="text-sm text-muted-foreground">{size.slices} fatias</div>
                <ul className="text-sm space-y-1 pt-2 border-t">
                  {flavorIds.map((id) => {
                    const f = allFlavors.find((x) => x.id === id);
                    const frac = flavorIds.length === 1 ? "" : flavorIds.length === 2 ? "½ " : "⅓ ";
                    return (
                      <li key={id} className="flex justify-between">
                        <span>
                          {frac}
                          {f?.name}
                        </span>
                        <span className="text-muted-foreground">{brl(priceOf(id, size.id))}</span>
                      </li>
                    );
                  })}
                  {crust && Number(crust.price) > 0 && (
                    <li className="flex justify-between">
                      <span>Borda {crust.name}</span>
                      <span className="text-muted-foreground">+ {brl(Number(crust.price))}</span>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Observação</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                  placeholder="Ex: sem cebola, bem assada..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Quantidade</span>
                <div className="flex items-center gap-1 border rounded-full p-1 ml-auto">
                  <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => setQty((q) => q + 1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t p-4 bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">{brl(total)}</div>
            </div>
            {step < 4 ? (
              <Button
                size="lg"
                className="flex-1 max-w-[60%]"
                disabled={!canNext}
                onClick={() => setStep((s) => (s + 1) as Step)}
              >
                Continuar
              </Button>
            ) : (
              <Button size="lg" className="flex-1 max-w-[60%]" onClick={handleAdd}>
                Adicionar ao carrinho
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
