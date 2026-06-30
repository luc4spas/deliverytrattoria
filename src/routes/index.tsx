import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Pizza as PizzaIcon } from "lucide-react";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { ProductCard } from "@/components/menu/ProductCard";
import { ProductDialog } from "@/components/menu/ProductDialog";
import { ComboCard } from "@/components/menu/ComboCard";
import { ComboBuilder } from "@/components/menu/ComboBuilder";
import { CategoryChips } from "@/components/menu/CategoryChips";
import { CategoryHeroCard } from "@/components/menu/CategoryHeroCard";
import { BottomNav } from "@/components/menu/BottomNav";
import { PizzaBuilder, type FlavorGroup } from "@/components/menu/PizzaBuilder";
import { CartDrawer } from "@/components/menu/CartDrawer";
import { CheckoutDialog } from "@/components/menu/CheckoutDialog";
import { useSettings } from "@/hooks/use-settings";
import { useCategories, useProducts, type Product } from "@/hooks/use-menu";

export const Route = createFileRoute("/")({
  component: MenuPage,
  head: () => ({
    meta: [
      { title: "Cardápio Digital" },
      { name: "description", content: "Faça seu pedido direto pelo cardápio digital." },
    ],
  }),
});

function MenuPage() {
  const { data: settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);
  const [comboSelected, setComboSelected] = useState<Product | null>(null);
  const [pizzaOpen, setPizzaOpen] = useState(false);
  const [initialFlavorId, setInitialFlavorId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [search, setSearch] = useState("");
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handler = (e: Event) => setSearch((e as CustomEvent<string>).detail);
    window.addEventListener("menu-search", handler as EventListener);
    return () => window.removeEventListener("menu-search", handler as EventListener);
  }, []);

  const byCategory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q)
        )
      : products;
    const map: Record<string, Product[]> = {};
    for (const p of filtered) {
      const k = p.category_id ?? "_";
      (map[k] ||= []).push(p);
    }
    return map;
  }, [products, search]);

  const activeCategories = categories.filter((c) => (byCategory[c.id]?.length ?? 0) > 0);

  // Sabores de pizza disponíveis em todo o cardápio (cliente pode misturar doce + salgado)
  const pizzaFlavorGroups: FlavorGroup[] = useMemo(() => {
    const groups: FlavorGroup[] = [];
    for (const c of categories) {
      const flavors = (byCategory[c.id] ?? []).filter(
        (p) => p.product_type === "pizza_flavor" && p.is_available
      );
      if (flavors.length === 0) continue;
      const label = (c.kind as string) === "pizza_doce" ? "Doces" : c.name;
      groups.push({ id: c.id, label, flavors });
    }
    return groups;
  }, [categories, byCategory]);

  const scrollTo = (id: string) =>
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen pb-24 md:pb-16">
      <MenuHeader settings={settings ?? null} />

      <nav className="sticky top-[72px] z-20 bg-background/90 backdrop-blur border-b">
        <div className="mx-auto max-w-3xl px-4">
          <CategoryChips categories={activeCategories} onSelect={scrollTo} />
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 mt-5 space-y-10">
        {activeCategories.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {search ? "Nada encontrado." : "Nenhum produto cadastrado ainda."}
          </p>
        )}

        {activeCategories.length > 0 && !search && (
          <section className="grid gap-3">
            {activeCategories.map((cat) => (
              <CategoryHeroCard
                key={`hero-${cat.id}`}
                category={cat}
                itemCount={byCategory[cat.id]?.length ?? 0}
                onClick={() => scrollTo(cat.id)}
              />
            ))}
          </section>
        )}

        {activeCategories.map((cat) => {
          const items = byCategory[cat.id] ?? [];
          const pizzaFlavors = items.filter((p) => p.product_type === "pizza_flavor");
          const combos = items.filter((p) => p.product_type === "combo");
          const simples = items.filter(
            (p) => p.product_type !== "pizza_flavor" && p.product_type !== "combo"
          );
          const hasPizza = pizzaFlavors.length > 0;

          return (
            <section
              key={cat.id}
              ref={(el: HTMLDivElement | null) => {
                refs.current[cat.id] = el;
              }}
              className="scroll-mt-44"
            >
              <header className="mb-3 flex items-end justify-between gap-3">
                <h2 className="text-xl font-bold">{cat.name}</h2>
                {cat.prep_time_minutes ? (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="size-3" /> {cat.prep_time_minutes} min
                  </span>
                ) : null}
              </header>

              {hasPizza && (
                <>
                  <button
                    onClick={() => {
                      setInitialFlavorId(null);
                      setPizzaOpen(true);
                    }}
                    className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 flex items-center gap-3 mb-3 shadow-md hover:shadow-lg transition"
                  >
                    <div className="size-12 rounded-full bg-white/15 grid place-items-center shrink-0">
                      <PizzaIcon className="size-6" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-bold">Monte sua pizza</div>
                      <div className="text-xs opacity-90">
                        Tamanho, sabores (doce + salgado) e borda
                      </div>
                    </div>
                    <span className="font-bold">→</span>
                  </button>

                  <div className="grid gap-3">
                    {pizzaFlavors.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        hidePrice
                        onClick={() => {
                          setInitialFlavorId(p.id);
                          setPizzaOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {combos.length > 0 && (
                <div className={`grid gap-3 ${hasPizza ? "mt-3" : ""}`}>
                  {combos.map((p) => (
                    <ComboCard key={p.id} product={p} onClick={() => setComboSelected(p)} />
                  ))}
                </div>
              )}

              {simples.length > 0 && (
                <div className={`grid gap-3 ${hasPizza || combos.length > 0 ? "mt-3" : ""}`}>
                  {simples.map((p) => (
                    <ProductCard key={p.id} product={p} onClick={() => setSelected(p)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>

      <ProductDialog
        product={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
      <ComboBuilder
        product={comboSelected}
        open={!!comboSelected}
        onOpenChange={(o) => !o && setComboSelected(null)}
      />
      <PizzaBuilder
        open={pizzaOpen}
        onOpenChange={(o) => {
          setPizzaOpen(o);
          if (!o) setInitialFlavorId(null);
        }}
        flavorGroups={pizzaFlavorGroups}
        initialFlavorId={initialFlavorId}
      />
      <CartDrawer settings={settings ?? null} onCheckout={() => setCheckoutOpen(true)} />
      <CheckoutDialog
        settings={settings ?? null}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      />
      <BottomNav />
    </div>
  );
}
