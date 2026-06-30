import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  usePizzaSizes,
  usePizzaCrusts,
  usePizzaFlavorPrices,
  type PizzaSize,
  type PizzaCrust,
} from "@/hooks/use-pizza";
import { useProducts } from "@/hooks/use-menu";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_protected/admin/pizzas")({
  component: PizzasAdmin,
});

function PizzasAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pizzas</h1>
        <p className="text-sm text-muted-foreground">
          Configure tamanhos, bordas e o preço de cada sabor por tamanho.
        </p>
      </div>
      <Tabs defaultValue="sizes">
        <TabsList>
          <TabsTrigger value="sizes">Tamanhos</TabsTrigger>
          <TabsTrigger value="crusts">Bordas</TabsTrigger>
          <TabsTrigger value="prices">Preços dos sabores</TabsTrigger>
        </TabsList>
        <TabsContent value="sizes" className="mt-4"><SizesTab /></TabsContent>
        <TabsContent value="crusts" className="mt-4"><CrustsTab /></TabsContent>
        <TabsContent value="prices" className="mt-4"><PricesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- SIZES ---------------- */

type SizeDraft = { id?: string; name: string; slices: string; max_flavors: string; sort_order: string; is_active: boolean };
const emptySize: SizeDraft = { name: "", slices: "8", max_flavors: "2", sort_order: "0", is_active: true };

function SizesTab() {
  const { data: sizes = [] } = usePizzaSizes();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SizeDraft>(emptySize);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: draft.name.trim(),
        slices: Number(draft.slices) || 8,
        max_flavors: Number(draft.max_flavors) || 1,
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
      };
      if (!payload.name) throw new Error("Nome obrigatório");
      if (draft.id) {
        const { error } = await supabase.from("pizza_sizes").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pizza_sizes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pizza_sizes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pizza_sizes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pizza_sizes"] });
      qc.invalidateQueries({ queryKey: ["pizza_flavor_prices"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startNew = () => { setDraft(emptySize); setOpen(true); };
  const startEdit = (s: PizzaSize) => {
    setDraft({
      id: s.id,
      name: s.name,
      slices: String(s.slices),
      max_flavors: String(s.max_flavors),
      sort_order: String(s.sort_order),
      is_active: s.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={startNew}><Plus className="size-4" /> Novo tamanho</Button>
      </div>
      <div className="grid gap-2">
        {sizes.map((s) => (
          <Card key={s.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{s.name} {!s.is_active && <span className="text-xs text-muted-foreground">(inativo)</span>}</div>
              <div className="text-xs text-muted-foreground">{s.slices} fatias · até {s.max_flavors} sabor{s.max_flavors > 1 ? "es" : ""}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => startEdit(s)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </Card>
        ))}
        {sizes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum tamanho.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{draft.id ? "Editar" : "Novo"} tamanho</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Grande" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Fatias</Label>
                <Input value={draft.slices} onChange={(e) => setDraft({ ...draft, slices: e.target.value })} inputMode="numeric" />
              </div>
              <div>
                <Label>Máx sabores</Label>
                <Input value={draft.max_flavors} onChange={(e) => setDraft({ ...draft, max_flavors: e.target.value })} inputMode="numeric" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} inputMode="numeric" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Ativo no cardápio</Label>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- CRUSTS ---------------- */

type CrustDraft = { id?: string; name: string; price: string; sort_order: string; is_active: boolean };
const emptyCrust: CrustDraft = { name: "", price: "0", sort_order: "0", is_active: true };

function CrustsTab() {
  const { data: crusts = [] } = usePizzaCrusts();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CrustDraft>(emptyCrust);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: draft.name.trim(),
        price: Number(draft.price.replace(",", ".")) || 0,
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
      };
      if (!payload.name) throw new Error("Nome obrigatório");
      if (draft.id) {
        const { error } = await supabase.from("pizza_crusts").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pizza_crusts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pizza_crusts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pizza_crusts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pizza_crusts"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startNew = () => { setDraft(emptyCrust); setOpen(true); };
  const startEdit = (c: PizzaCrust) => {
    setDraft({ id: c.id, name: c.name, price: String(c.price), sort_order: String(c.sort_order), is_active: c.is_active });
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={startNew}><Plus className="size-4" /> Nova borda</Button>
      </div>
      <div className="grid gap-2">
        {crusts.map((c) => (
          <Card key={c.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{c.name} {!c.is_active && <span className="text-xs text-muted-foreground">(inativo)</span>}</div>
              <div className="text-xs text-muted-foreground">{Number(c.price) > 0 ? `+ ${brl(Number(c.price))}` : "Grátis"}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </Card>
        ))}
        {crusts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma borda.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{draft.id ? "Editar" : "Nova"} borda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Catupiry" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço (R$)</Label>
                <Input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} inputMode="decimal" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} inputMode="numeric" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Ativa</Label>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- FLAVOR PRICES MATRIX ---------------- */

function PricesTab() {
  const { data: products = [] } = useProducts();
  const { data: sizes = [] } = usePizzaSizes();
  const { data: prices = [] } = usePizzaFlavorPrices();
  const qc = useQueryClient();

  const flavors = useMemo(() => products.filter((p) => p.product_type === "pizza_flavor"), [products]);

  const [edits, setEdits] = useState<Record<string, string>>({});
  const key = (pid: string, sid: string) => `${pid}|${sid}`;
  const current = (pid: string, sid: string) => {
    const k = key(pid, sid);
    if (edits[k] !== undefined) return edits[k];
    const p = prices.find((x) => x.product_id === pid && x.size_id === sid);
    return p ? String(p.price) : "";
  };

  const save = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(edits)
        .map(([k, v]) => {
          const [product_id, size_id] = k.split("|");
          const price = Number(v.replace(",", ".")) || 0;
          return { product_id, size_id, price };
        });
      if (rows.length === 0) return;
      // upsert: delete zero, upsert positive
      const toDelete = rows.filter((r) => r.price <= 0);
      const toUpsert = rows.filter((r) => r.price > 0);
      for (const r of toDelete) {
        await supabase
          .from("pizza_flavor_prices")
          .delete()
          .eq("product_id", r.product_id)
          .eq("size_id", r.size_id);
      }
      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("pizza_flavor_prices")
          .upsert(toUpsert, { onConflict: "product_id,size_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Preços atualizados");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["pizza_flavor_prices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (flavors.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Nenhum sabor cadastrado. Vá em <strong>Produtos</strong> e crie produtos do tipo <em>Sabor de pizza</em>.
      </Card>
    );
  }
  if (sizes.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">Crie tamanhos primeiro.</Card>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Defina o preço de cada sabor em cada tamanho. Deixe em <strong>0</strong> ou vazio para indisponível.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Sabor</th>
              {sizes.map((s) => (
                <th key={s.id} className="text-left p-3 font-medium whitespace-nowrap">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flavors.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-3 font-medium">{f.name}</td>
                {sizes.map((s) => (
                  <td key={s.id} className="p-2">
                    <Input
                      value={current(f.id, s.id)}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [key(f.id, s.id)]: e.target.value }))}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-24"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending || Object.keys(edits).length === 0}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
