import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";
import { useProducts } from "@/hooks/use-menu";
import { usePizzaSizes } from "@/hooks/use-pizza";
import { toast } from "sonner";

type Step = {
  id: string;
  product_id: string;
  name: string;
  sort_order: number;
  min_choices: number;
  max_choices: number;
};

type StepItem = {
  id: string;
  step_id: string;
  product_id: string;
  size_id: string | null;
  extra_price: number;
};

export function ComboStepsEditor({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const { data: sizes = [] } = usePizzaSizes();

  const stepsQuery = useQuery({
    queryKey: ["combo_steps", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("combo_steps")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Step[];
    },
  });

  const itemsQuery = useQuery({
    enabled: (stepsQuery.data?.length ?? 0) > 0,
    queryKey: ["combo_step_items", productId, stepsQuery.data?.map((s) => s.id).join(",")],
    queryFn: async () => {
      const ids = (stepsQuery.data ?? []).map((s) => s.id);
      if (!ids.length) return [] as StepItem[];
      const { data, error } = await supabase
        .from("combo_step_items")
        .select("*")
        .in("step_id", ids);
      if (error) throw error;
      return (data ?? []) as StepItem[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["combo_steps", productId] });
    qc.invalidateQueries({ queryKey: ["combo_step_items"] });
    qc.invalidateQueries({ queryKey: ["combo_structure", productId] });
  };

  const addStep = useMutation({
    mutationFn: async () => {
      const next = (stepsQuery.data?.length ?? 0);
      const { error } = await supabase.from("combo_steps").insert({
        product_id: productId,
        name: `Etapa ${next + 1}`,
        sort_order: next,
        min_choices: 1,
        max_choices: 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Step> }) => {
      const { error } = await supabase.from("combo_steps").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("combo_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async ({
      stepId,
      product_id,
      size_id,
    }: {
      stepId: string;
      product_id: string;
      size_id: string | null;
    }) => {
      const { error } = await supabase.from("combo_step_items").insert({
        step_id: stepId,
        product_id,
        size_id,
        extra_price: 0,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<StepItem> }) => {
      const { error } = await supabase.from("combo_step_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("combo_step_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const move = (id: string, dir: -1 | 1) => {
    const list = [...(stepsQuery.data ?? [])];
    const idx = list.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const a = list[idx];
    const b = list[swap];
    updateStep.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    updateStep.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const sizeName = (id: string | null) => (id ? sizes.find((s) => s.id === id)?.name ?? "—" : null);

  const steps = stepsQuery.data ?? [];
  const items = itemsQuery.data ?? [];

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="m-0">Etapas do combo</Label>
          <p className="text-xs text-muted-foreground">
            Configure quais produtos e tamanhos o cliente pode escolher em cada passo.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => addStep.mutate()}>
          <Plus className="size-3" /> Etapa
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">Nenhuma etapa ainda.</p>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => {
          const stepItems = items.filter((it) => it.step_id === step.id);
          return (
            <StepEditor
              key={step.id}
              step={step}
              items={stepItems}
              products={products}
              sizes={sizes}
              productName={productName}
              sizeName={sizeName}
              isFirst={i === 0}
              isLast={i === steps.length - 1}
              onMoveUp={() => move(step.id, -1)}
              onMoveDown={() => move(step.id, 1)}
              onDelete={() => deleteStep.mutate(step.id)}
              onPatch={(patch) => updateStep.mutate({ id: step.id, patch })}
              onAddItem={(payload) => addItem.mutate({ stepId: step.id, ...payload })}
              onUpdateItem={(id, patch) => updateItem.mutate({ id, patch })}
              onDeleteItem={(id) => deleteItem.mutate(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function StepEditor({
  step,
  items,
  products,
  sizes,
  productName,
  sizeName,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onPatch,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  step: Step;
  items: StepItem[];
  products: { id: string; name: string; product_type: string }[];
  sizes: { id: string; name: string }[];
  productName: (id: string) => string;
  sizeName: (id: string | null) => string | null;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onPatch: (patch: Partial<Step>) => void;
  onAddItem: (p: { product_id: string; size_id: string | null }) => void;
  onUpdateItem: (id: string, patch: Partial<StepItem>) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [newProduct, setNewProduct] = useState<string>("");
  const [newSize, setNewSize] = useState<string>("");
  const [name, setName] = useState(step.name);
  const [minC, setMinC] = useState(String(step.min_choices));
  const [maxC, setMaxC] = useState(String(step.max_choices));

  const selectedIsPizza =
    products.find((p) => p.id === newProduct)?.product_type === "pizza_flavor";

  return (
    <div className="rounded-lg border bg-muted/20">
      <div className="p-3 grid grid-cols-[1fr_auto] gap-2 items-start border-b">
        <div className="grid gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== step.name && onPatch({ name })}
            placeholder="Ex: Escolha a pizza salgada"
            className="font-medium"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Mín.</Label>
              <Input
                value={minC}
                onChange={(e) => setMinC(e.target.value)}
                onBlur={() => {
                  const v = Math.max(0, parseInt(minC, 10) || 0);
                  if (v !== step.min_choices) onPatch({ min_choices: v });
                }}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label className="text-xs">Máx.</Label>
              <Input
                value={maxC}
                onChange={(e) => setMaxC(e.target.value)}
                onBlur={() => {
                  const v = Math.max(1, parseInt(maxC, 10) || 1);
                  if (v !== step.max_choices) onPatch({ max_choices: v });
                }}
                inputMode="numeric"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" size="icon" variant="ghost" disabled={isFirst} onClick={onMoveUp}>
            <ChevronUp className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" disabled={isLast} onClick={onMoveDown}>
            <ChevronDown className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum item permitido ainda.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
            <div className="text-sm truncate">
              <span className="font-medium">{productName(it.product_id)}</span>
              {sizeName(it.size_id) && (
                <span className="text-muted-foreground"> · {sizeName(it.size_id)}</span>
              )}
            </div>
            <Input
              value={String(it.extra_price)}
              onChange={(e) =>
                onUpdateItem(it.id, {
                  extra_price: Number(e.target.value.replace(",", ".")) || 0,
                })
              }
              placeholder="+0,00"
              inputMode="decimal"
              className="h-8 text-xs"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => onDeleteItem(it.id)}>
              <X className="size-4" />
            </Button>
          </div>
        ))}

        <div className="grid grid-cols-[1fr_140px_auto] gap-2 pt-2 border-t">
          <select
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Selecionar produto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.product_type === "pizza_flavor" ? " (sabor)" : ""}
              </option>
            ))}
          </select>
          <select
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            disabled={!selectedIsPizza}
            className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          >
            <option value="">{selectedIsPizza ? "Tamanho…" : "—"}</option>
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!newProduct || (selectedIsPizza && !newSize)}
            onClick={() => {
              onAddItem({ product_id: newProduct, size_id: selectedIsPizza ? newSize : null });
              setNewProduct("");
              setNewSize("");
            }}
          >
            <Plus className="size-3" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
