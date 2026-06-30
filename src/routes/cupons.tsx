import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ticket, Copy, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/menu/BottomNav";
import { useTodaysAutoPromotion } from "@/hooks/use-promotions";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/cupons")({
  component: CuponsPage,
  head: () => ({ meta: [{ title: "Cupons e promoções" }] }),
});

function formatDiscount(type: string, value: number) {
  if (type === "percentage") return `${value}% OFF`;
  if (type === "free_shipping") return "Frete grátis";
  return `${brl(value)} OFF`;
}

function CuponsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const { todayPromo } = useTodaysAutoPromotion();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["public-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const now = new Date();
      return (data ?? []).filter((c: any) => {
        if (c.valid_until && new Date(c.valid_until) < now) return false;
        if (c.valid_from && new Date(c.valid_from) > now) return false;
        if (c.max_uses != null && c.uses >= c.max_uses) return false;
        return true;
      });
    },
  });

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-20 bg-card border-b">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="size-5" /></Link>
          </Button>
          <h1 className="font-bold text-lg">Cupons e promoções</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {todayPromo && (
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-primary/15 grid place-items-center shrink-0">
                <Ticket className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <Badge className="mb-1">Promoção do dia</Badge>
                <div className="font-bold">{todayPromo.name}</div>
                {todayPromo.description && (
                  <p className="text-sm text-muted-foreground">{todayPromo.description}</p>
                )}
                <p className="text-sm mt-1 font-medium text-primary">
                  {formatDiscount(todayPromo.discount_type, Number(todayPromo.discount_value))} aplicado automaticamente
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando…</p>
        ) : coupons.length === 0 && !todayPromo ? (
          <div className="text-center py-16 text-muted-foreground">
            <Ticket className="size-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum cupom disponível no momento.</p>
          </div>
        ) : (
          coupons.map((c: any) => (
            <Card key={c.id} className="p-4 flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <Ticket className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold text-base">{c.code}</div>
                <div className="text-sm text-primary font-semibold">
                  {formatDiscount(c.discount_type, Number(c.discount_value))}
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                {Number(c.min_order_value) > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Pedido mínimo: {brl(Number(c.min_order_value))}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(c.code)}>
                {copied === c.code ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </Card>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
