import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, X, Search } from "lucide-react";
import { useCategories, useProducts, type Product } from "@/hooks/use-menu";
import { ComboStepsEditor } from "@/components/admin/ComboStepsEditor";
import { PaginationBar, paginate } from "@/components/admin/PaginationBar";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_protected/admin/produtos")({
  component: ProductsPage,
});

type ProductType = "simple" | "pizza_flavor" | "combo";

type ComboItem = { name: string; qty: number; note?: string };

type Draft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  category_id: string | null;
  is_available: boolean;
  image_url: string | null;
  product_type: ProductType;
  combo_items: ComboItem[];
};

const empty: Draft = {
  name: "",
  description: "",
  price: "",
  category_id: null,
  is_available: true,
  image_url: null,
  product_type: "simple",
  combo_items: [],
};

function ProductsPage() {
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const startNew = () => { setDraft(empty); setOpen(true); };
  const startEdit = (p: Product) => {
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      category_id: p.category_id,
      is_available: p.is_available,
      image_url: p.image_url,
      product_type: ((p as any).product_type ?? "simple") as ProductType,
      combo_items: Array.isArray((p as any).combo_items)
        ? ((p as any).combo_items as ComboItem[])
        : [],
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Nome obrigatório");
      const payload: any = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price: Number(draft.price.replace(",", ".")) || 0,
        category_id: draft.category_id,
        is_available: draft.is_available,
        image_url: draft.image_url,
        product_type: draft.product_type,
        combo_items: draft.product_type === "combo" ? draft.combo_items : [],
      };
      if (draft.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setDraft((d) => ({ ...d, image_url: data.publicUrl }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const addComboItem = () =>
    setDraft((d) => ({ ...d, combo_items: [...d.combo_items, { name: "", qty: 1 }] }));
  const updateComboItem = (i: number, patch: Partial<ComboItem>) =>
    setDraft((d) => ({
      ...d,
      combo_items: d.combo_items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  const removeComboItem = (i: number) =>
    setDraft((d) => ({ ...d, combo_items: d.combo_items.filter((_, idx) => idx !== i) }));

  const typeLabel = (t: ProductType) =>
    t === "pizza_flavor" ? "Sabor" : t === "combo" ? "Combo" : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== "all") {
        if (categoryFilter === "none" ? p.category_id !== null : p.category_id !== categoryFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  useEffect(() => { setPage(1); }, [search, categoryFilter, pageSize]);

  const pageItems = paginate(filtered, { page, pageSize });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {products.length} cadastrados
          </p>
        </div>
        <Button onClick={startNew}><Plus className="size-4" /> Novo produto</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="none">Sem categoria</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {pageItems.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </Card>
        )}
        {pageItems.map((p) => {
          const cat = categories.find((c) => c.id === p.category_id);
          const t = ((p as any).product_type ?? "simple") as ProductType;
          const tl = typeLabel(t);
          return (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              {p.image_url ? (
                <img src={p.image_url} className="size-14 rounded-lg object-cover" alt="" />
              ) : (
                <div className="size-14 rounded-lg bg-muted grid place-items-center text-xl">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {p.name}
                  {tl && (
                    <span className="text-[10px] uppercase tracking-wide rounded bg-primary/10 text-primary px-1.5 py-0.5">{tl}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {cat?.name ?? "Sem categoria"} · {t === "pizza_flavor" ? "preço por tamanho" : brl(Number(p.price))} · {p.is_available ? "Disponível" : "Indisponível"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </Card>
          );
        })}
      </div>

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} maxLength={300} />
            </div>
            <div>
              <Label>Tipo do produto</Label>
              <Select value={draft.product_type} onValueChange={(v) => setDraft({ ...draft, product_type: v as ProductType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Item comum (bebida, sobremesa, lanche…)</SelectItem>
                  <SelectItem value="pizza_flavor">Sabor de pizza (preço por tamanho)</SelectItem>
                  <SelectItem value="combo">Combo (preço fechado + itens inclusos)</SelectItem>
                </SelectContent>
              </Select>
              {draft.product_type === "pizza_flavor" && (
                <p className="text-xs text-muted-foreground mt-1">
                  O preço unitário abaixo é ignorado. Configure os preços por tamanho em <strong>Pizzas → Preços dos sabores</strong>.
                </p>
              )}
              {draft.product_type === "combo" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Preço fechado. Defina abaixo os itens que vão dentro do combo.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{draft.product_type === "pizza_flavor" ? "Preço base (ref.)" : "Preço (R$)"}</Label>
                <Input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} inputMode="decimal" placeholder="29,90" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={draft.category_id ?? ""} onValueChange={(v) => setDraft({ ...draft, category_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.kind === "pizza" ? " · pizza salgada" : ""}
                        {(c.kind as string) === "pizza_doce" ? " · pizza doce" : ""}
                        {(c.kind as string) === "combo" ? " · combo" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.product_type === "combo" && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="m-0">Itens inclusos no combo</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addComboItem}>
                    <Plus className="size-3" /> Adicionar
                  </Button>
                </div>
                {draft.combo_items.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum item ainda.</p>
                )}
                {draft.combo_items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[60px_1fr_auto] gap-2 items-center">
                    <Input
                      value={it.qty}
                      onChange={(e) => updateComboItem(i, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      inputMode="numeric"
                      className="text-center"
                    />
                    <Input
                      value={it.name}
                      onChange={(e) => updateComboItem(i, { name: e.target.value })}
                      placeholder="Pizza grande 2 sabores"
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeComboItem(i)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground pt-1">
                  Lista textual exibida no cardápio. Para travar exatamente quais sabores/tamanhos o cliente pode escolher, use as <strong>Etapas do combo</strong> abaixo.
                </p>
              </div>
            )}

            {draft.product_type === "combo" && draft.id && (
              <ComboStepsEditor productId={draft.id} />
            )}
            {draft.product_type === "combo" && !draft.id && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Salve o combo primeiro para configurar as etapas de escolha (sabores e tamanhos permitidos).
              </div>
            )}

            <div>
              <Label>Foto</Label>
              <div className="mt-1 flex gap-3 items-center">
                {draft.image_url ? (
                  <img src={draft.image_url} className="size-16 rounded-lg object-cover" alt="" />
                ) : (
                  <div className="size-16 rounded-lg bg-muted grid place-items-center text-muted-foreground">🍽️</div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                />
                {draft.image_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDraft({ ...draft, image_url: null })}>Remover</Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium text-sm">Disponível</div>
                <div className="text-xs text-muted-foreground">Aparece no cardápio</div>
              </div>
              <Switch checked={draft.is_available} onCheckedChange={(v) => setDraft({ ...draft, is_available: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
