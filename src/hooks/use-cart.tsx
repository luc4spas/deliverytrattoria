import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PizzaCartMeta = {
  kind: "pizza";
  sizeId: string;
  sizeName: string;
  slices: number;
  flavors: { id: string; name: string }[];
  crust: { id: string; name: string; price: number } | null;
};

export type ComboCartMeta = {
  kind: "combo";
  selections: { stepName: string; items: { name: string; sizeName?: string | null }[] }[];
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  notes?: string;
  meta?: PizzaCartMeta | ComboCartMeta;
  /** unique line id when meta is present (so two different pizzas don't merge) */
  lineId?: string;
};

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "menu-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const keyOf = (i: CartItem) => i.lineId ?? `${i.productId}|${i.notes ?? ""}`;
    return {
      items,
      add: (item) =>
        setItems((prev) => {
          // Pizzas always get their own line (custom config). Otherwise merge by productId+notes.
          if (item.meta) {
            const lineId = item.lineId ?? crypto.randomUUID();
            return [...prev, { ...item, lineId }];
          }
          const idx = prev.findIndex(
            (p) => !p.meta && p.productId === item.productId && (p.notes ?? "") === (item.notes ?? "")
          );
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + item.quantity };
            return copy;
          }
          return [...prev, item];
        }),
      remove: (key) => setItems((prev) => prev.filter((i) => keyOf(i) !== key && i.productId !== key)),
      setQty: (key, qty) =>
        setItems((prev) =>
          prev
            .map((i) => ((keyOf(i) === key || (!i.lineId && i.productId === key)) ? { ...i, quantity: qty } : i))
            .filter((i) => i.quantity > 0)
        ),
      clear: () => setItems([]),
      subtotal,
      count,
      open,
      setOpen,
    };
  }, [items, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
