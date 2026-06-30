import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus } from "lucide-react";
import { brl } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/hooks/use-menu";
import { toast } from "sonner";

export function ProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const { add } = useCart();

  if (!product) return null;

  const total = Number(product.price) * qty;

  const handleAdd = () => {
    add({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      quantity: qty,
      notes: notes.trim() || undefined,
    });
    toast.success(`${qty}x ${product.name} adicionado`);
    onOpenChange(false);
    setQty(1);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="w-full aspect-[4/3] object-cover" />
        )}
        <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
          </DialogHeader>
          {product.description && (
            <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
          )}
          <div className="mt-4">
            <label className="text-xs font-medium text-muted-foreground">Observação</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              placeholder="Ex: sem cebola, ponto da carne..."
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 border rounded-full p-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-full"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-full"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <Button onClick={handleAdd} className="flex-1" size="lg">
              Adicionar · {brl(total)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
