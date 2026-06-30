import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, TicketPercent, BadgePercent, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/use-menu";
import { brl } from "@/lib/format";
import { DAYS_OF_WEEK } from "@/lib/promotions-shared";

export const Route = createFileRoute("/_protected/admin/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing & Promoções</h1>
        <p className="text-sm text-muted-foreground">
          Crie cupons e descontos automáticos para impulsionar suas vendas.
        </p>
      </div>

      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons" className="gap-1.5">
            <TicketPercent className="size-4" /> Cupons de Desconto
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-1.5">
            <BadgePercent className="size-4" /> Promoções Automáticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-4">
          <CouponsTab />
        </TabsContent>
        <TabsContent value="auto" className="mt-4">
          <AutoPromotionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── COUPONS ──────────────────────────────────────────────────────────────
type CouponDraft = {
  id?: string;
  code: string;
  description: string;
  discount_type: "fixed" | "percent" | "free_shipping";
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  valid_until: string;
  is_active: boolean;
};

const emptyCoupon: CouponDraft = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "10",
  min_order_value: "0",
  max_uses: "",
  valid_until: "",
  is_active: true,
};

function CouponsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CouponDraft>(emptyCoupon);

  const { data: coupons = [] } = useQuery({
    queryKey: ["admin_coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.code.trim()) throw new Error("Informe o código");
      const payload = {
        code: draft.code.trim().toUpperCase(),
        description: draft.description.trim() || null,
        discount_type: draft.discount_type,
        discount_value:
          draft.discount_type === "free_shipping" ? 0 : Number(draft.discount_value) || 0,
        min_order_value: Number(draft.min_order_value) || 0,
        max_uses: draft.max_uses ? Number(draft.max_uses) : null,
        valid_until: draft.valid_until ? new Date(draft.valid_until).toISOString() : null,
        is_active: draft.is_active,
      };
      if (draft.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cupom salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin_coupons"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["admin_coupons"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startNew = () => { setDraft(emptyCoupon); setOpen(true); };
  const startEdit = (c: any) => {
    setDraft({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value ?? ""),
      min_order_value: String(c.min_order_value ?? "0"),
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      valid_until: c.valid_until ? String(c.valid_until).slice(0, 10) : "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const typeLabel = (t: string, v: number) =>
    t === "percent" ? `${v}%` : t === "free_shipping" ? "Frete grátis" : brl(v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{coupons.length} cupom(ns) cadastrado(s)</p>
        <Button onClick={startNew}><Plus className="size-4" /> Novo cupom</Button>
      </div>

      <div className="grid gap-2">
        {coupons.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhum cupom criado. Clique em "Novo cupom" para começar.
          </Card>
        )}
        {coupons.map((c: any) => (
          <Card key={c.id} className="p-3 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
              <TicketPercent className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{c.code}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                  {typeLabel(c.discount_type, Number(c.discount_value))}
                </span>
                {!c.is_active && <span className="text-xs text-destructive">inativo</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.uses}/{c.max_uses ?? "∞"} usos
                {Number(c.min_order_value) > 0 && ` · mín. ${brl(Number(c.min_order_value))}`}
                {c.valid_until && ` · até ${new Date(c.valid_until).toLocaleDateString("pt-BR")}`}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>Editar</Button>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar cupom" : "Novo cupom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código</Label>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().slice(0, 40) })}
                placeholder="EX: PROMO10"
                className="uppercase font-mono"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 120) })}
                placeholder="Ex: Boas-vindas"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={draft.discount_type}
                  onValueChange={(v) => setDraft({ ...draft, discount_type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    <SelectItem value="free_shipping">Frete grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.discount_type !== "free_shipping" && (
                <div>
                  <Label>Valor</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.discount_value}
                    onChange={(e) => setDraft({ ...draft, discount_value: e.target.value.replace(",", ".") })}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pedido mínimo (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={draft.min_order_value}
                  onChange={(e) => setDraft({ ...draft, min_order_value: e.target.value.replace(",", ".") })}
                />
              </div>
              <div>
                <Label>Limite de usos</Label>
                <Input
                  inputMode="numeric"
                  value={draft.max_uses}
                  onChange={(e) => setDraft({ ...draft, max_uses: e.target.value.replace(/\D/g, "") })}
                  placeholder="Ilimitado"
                />
              </div>
            </div>
            <div>
              <Label>Validade</Label>
              <Input
                type="date"
                value={draft.valid_until}
                onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Cupons inativos não podem ser usados</div>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
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

// ─── AUTOMATIC PROMOTIONS ─────────────────────────────────────────────────
type AutoDraft = {
  id?: string;
  name: string;
  description: string;
  discount_type: "fixed" | "percent";
  discount_value: string;
  days_of_week: number[];
  category_id: string | null;
  min_order_value: string;
  valid_until: string;
  is_active: boolean;
};

const emptyAuto: AutoDraft = {
  name: "",
  description: "",
  discount_type: "percent",
  discount_value: "10",
  days_of_week: [],
  category_id: null,
  min_order_value: "0",
  valid_until: "",
  is_active: true,
};

function AutoPromotionsTab() {
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AutoDraft>(emptyAuto);

  const { data: promos = [] } = useQuery({
    queryKey: ["admin_auto_promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automatic_promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Informe o nome");
      if (draft.days_of_week.length === 0) throw new Error("Selecione ao menos um dia da semana");
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        discount_type: draft.discount_type,
        discount_value: Number(draft.discount_value) || 0,
        days_of_week: draft.days_of_week,
        category_id: draft.category_id,
        min_order_value: Number(draft.min_order_value) || 0,
        valid_until: draft.valid_until ? new Date(draft.valid_until).toISOString() : null,
        is_active: draft.is_active,
      };
      if (draft.id) {
        const { error } = await supabase.from("automatic_promotions").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automatic_promotions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Promoção salva");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin_auto_promotions"] });
      qc.invalidateQueries({ queryKey: ["automatic_promotions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automatic_promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removida");
      qc.invalidateQueries({ queryKey: ["admin_auto_promotions"] });
      qc.invalidateQueries({ queryKey: ["automatic_promotions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startNew = () => { setDraft(emptyAuto); setOpen(true); };
  const startEdit = (p: any) => {
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      discount_type: p.discount_type,
      discount_value: String(p.discount_value ?? ""),
      days_of_week: Array.isArray(p.days_of_week) ? p.days_of_week : [],
      category_id: p.category_id ?? null,
      min_order_value: String(p.min_order_value ?? "0"),
      valid_until: p.valid_until ? String(p.valid_until).slice(0, 10) : "",
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const toggleDay = (d: number) =>
    setDraft((s) => ({
      ...s,
      days_of_week: s.days_of_week.includes(d)
        ? s.days_of_week.filter((x) => x !== d)
        : [...s.days_of_week, d].sort(),
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{promos.length} promoção(ões) cadastrada(s)</p>
        <Button onClick={startNew}><Plus className="size-4" /> Nova promoção</Button>
      </div>

      <div className="grid gap-2">
        {promos.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma promoção automática. Crie uma para aplicar descontos por dia da semana.
          </Card>
        )}
        {promos.map((p: any) => {
          const cat = categories.find((c) => c.id === p.category_id);
          const days = (p.days_of_week as number[]).map((d) => DAYS_OF_WEEK[d]?.short).join(", ");
          return (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-success/15 grid place-items-center">
                <BadgePercent className="size-5 text-success-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                    {p.discount_type === "percent" ? `${p.discount_value}%` : brl(Number(p.discount_value))}
                  </span>
                  {!p.is_active && <span className="text-xs text-destructive">inativa</span>}
                </div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="size-3" /> {days || "—"}
                  {cat && ` · categoria: ${cat.name}`}
                  {Number(p.min_order_value) > 0 && ` · mín. ${brl(Number(p.min_order_value))}`}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>Editar</Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar promoção" : "Nova promoção automática"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 80) })}
                placeholder="Ex: Terça da Pizza"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 120) })}
              />
            </div>
            <div>
              <Label>Dias da semana</Label>
              <div className="mt-1 flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((d) => {
                  const on = draft.days_of_week.includes(d.value);
                  return (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        on ? "bg-primary text-primary-foreground border-primary" : "hover:border-muted-foreground/40"
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={draft.discount_type}
                  onValueChange={(v) => setDraft({ ...draft, discount_type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  inputMode="decimal"
                  value={draft.discount_value}
                  onChange={(e) => setDraft({ ...draft, discount_value: e.target.value.replace(",", ".") })}
                />
              </div>
            </div>
            <div>
              <Label>Aplica em (opcional)</Label>
              <Select
                value={draft.category_id ?? "__all"}
                onValueChange={(v) => setDraft({ ...draft, category_id: v === "__all" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Todo o pedido" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todo o pedido (subtotal)</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Se escolher uma categoria, o desconto incide só nos itens dela.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pedido mínimo (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={draft.min_order_value}
                  onChange={(e) => setDraft({ ...draft, min_order_value: e.target.value.replace(",", ".") })}
                />
              </div>
              <div>
                <Label>Validade</Label>
                <Input
                  type="date"
                  value={draft.valid_until}
                  onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Ativa</div>
                <div className="text-xs text-muted-foreground">Promoções inativas são ignoradas no checkout</div>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
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
