import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Pizza, Sparkles, Pencil, IceCream2, Utensils, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useCategories, type Category } from "@/hooks/use-menu";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_protected/admin/categorias")({
  component: CategoriesPage,
});

type Kind = "regular" | "pizza" | "pizza_doce" | "combo";

const KIND_LABEL: Record<Kind, string> = {
  regular: "Comum",
  pizza: "Pizza salgada",
  pizza_doce: "Pizza doce",
  combo: "Combos",
};

type Draft = {
  id?: string;
  name: string;
  kind: Kind;
  image_url: string | null;
  prep_time_minutes: string;
};

const empty: Draft = { name: "", kind: "regular", image_url: null, prep_time_minutes: "" };

function KindIcon({ kind }: { kind: Kind }) {
  if (kind === "pizza") return <Pizza className="size-4 text-primary" />;
  if (kind === "pizza_doce") return <IceCream2 className="size-4 text-primary" />;
  if (kind === "combo") return <Sparkles className="size-4 text-primary" />;
  return <Utensils className="size-4 text-muted-foreground" />;
}

function CategoriesPage() {
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [uploading, setUploading] = useState(false);
  const [ordered, setOrdered] = useState<Category[]>(categories);

  useEffect(() => { setOrdered(categories); }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = useMutation({
    mutationFn: async (items: Category[]) => {
      const updates = items.map((c, i) =>
        supabase.from("categories").update({ sort_order: i }).eq("id", c.id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => {
      toast.error(e.message);
      setOrdered(categories);
    },
  });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((c) => c.id === active.id);
    const newIndex = ordered.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    reorder.mutate(next);
  };


  const startNew = () => { setDraft(empty); setOpen(true); };
  const startEdit = (c: Category) => {
    setDraft({
      id: c.id,
      name: c.name,
      kind: (c.kind as Kind) ?? "regular",
      image_url: c.image_url ?? null,
      prep_time_minutes: c.prep_time_minutes ? String(c.prep_time_minutes) : "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Informe um nome");
      const payload = {
        name: draft.name.trim(),
        kind: draft.kind,
        image_url: draft.image_url,
        prep_time_minutes: draft.prep_time_minutes
          ? Math.max(0, parseInt(draft.prep_time_minutes, 10) || 0)
          : null,
      };
      if (draft.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({
          ...payload,
          sort_order: (categories.at(-1)?.sort_order ?? 0) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removida");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `categories/${crypto.randomUUID()}.${ext}`;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Button onClick={startNew}><Plus className="size-4" /> Nova categoria</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Arraste pela alça <GripVertical className="inline size-3 align-middle" /> para definir a ordem em que as categorias aparecem para o cliente.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {ordered.map((c) => (
              <SortableCategoryRow
                key={c.id}
                category={c}
                onEdit={() => startEdit(c)}
                onRemove={() => remove.mutate(c.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as Kind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Comum (lanches, bebidas, etc.)</SelectItem>
                  <SelectItem value="pizza">Pizza salgada (builder)</SelectItem>
                  <SelectItem value="pizza_doce">Pizza doce (builder)</SelectItem>
                  <SelectItem value="combo">Combos (preço fechado)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {draft.kind === "regular" && "Mostra os produtos como cards normais."}
                {(draft.kind === "pizza" || draft.kind === "pizza_doce") && "Abre o montador. O cliente pode misturar sabores doces e salgados."}
                {draft.kind === "combo" && "Cada produto vira um combo destacado com lista de itens inclusos."}
              </p>
            </div>
            <div>
              <Label>Tempo de preparo (opcional)</Label>
              <Input
                value={draft.prep_time_minutes}
                onChange={(e) => setDraft({ ...draft, prep_time_minutes: e.target.value.replace(/\D/g, "") })}
                inputMode="numeric"
                placeholder="Ex: 35"
              />
            </div>
            <div>
              <Label>Foto da categoria</Label>
              <div className="mt-1 flex gap-3 items-center">
                {draft.image_url ? (
                  <img src={draft.image_url} className="size-16 rounded-full object-cover" alt="" />
                ) : (
                  <div className="size-16 rounded-full bg-muted grid place-items-center">
                    <KindIcon kind={draft.kind} />
                  </div>
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

function SortableCategoryRow({
  category,
  onEdit,
  onRemove,
}: {
  category: Category;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const kind = (category.kind as Kind) ?? "regular";
  return (
    <Card ref={setNodeRef} style={style} className="p-3 flex items-center gap-3">
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      {category.image_url ? (
        <img src={category.image_url} className="size-12 rounded-full object-cover" alt="" />
      ) : (
        <div className="size-12 rounded-full bg-muted grid place-items-center">
          <KindIcon kind={kind} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{category.name}</div>
        <div className="text-xs text-muted-foreground">
          {KIND_LABEL[kind]}
          {category.prep_time_minutes ? ` · ${category.prep_time_minutes} min` : ""}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </Card>
  );
}
