import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrders } from "@/lib/customer-auth.functions";
import { useCustomer } from "@/hooks/use-customer";
import { CustomerLoginDialog } from "@/components/menu/CustomerLoginDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { ArrowLeft, Receipt } from "lucide-react";
import { BottomNav } from "@/components/menu/BottomNav";

export const Route = createFileRoute("/meus-pedidos")({
  component: MyOrdersPage,
  head: () => ({ meta: [{ title: "Meus pedidos" }] }),
});

const STATUS_LABEL: Record<string, string> = {
  new: "Recebido",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  done: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  preparing: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  out_for_delivery: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
};

function MyOrdersPage() {
  const { customer, loading } = useCustomer();
  const fetchOrders = useServerFn(getMyOrders);
  const [loginOpen, setLoginOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!customer,
  });

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  }

  if (!customer) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <Card className="max-w-sm p-6 text-center">
          <Receipt className="size-10 mx-auto text-primary mb-3" />
          <h1 className="text-xl font-bold">Veja seus pedidos</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Entre com seu WhatsApp para ver o histórico de pedidos.
          </p>
          <Button className="w-full mt-4" onClick={() => setLoginOpen(true)}>
            Entrar com WhatsApp
          </Button>
          <Link to="/" className="block mt-3 text-xs text-muted-foreground hover:text-foreground">
            ← Voltar ao cardápio
          </Link>
        </Card>
        <CustomerLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  const orders = data?.orders ?? [];

  return (
    <div className="min-h-screen bg-muted/20 pb-24 md:pb-0">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="mx-auto max-w-2xl p-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold">Meus pedidos</h1>
            <p className="text-xs text-muted-foreground truncate">{customer.name || customer.phone}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Você ainda não fez nenhum pedido.
            <div className="mt-3">
              <Link to="/" className="text-primary hover:underline">Ver cardápio</Link>
            </div>
          </Card>
        ) : (
          orders.map((o: any) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">
                    #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </div>
                  <div className="font-semibold mt-0.5">{brl(Number(o.total))}</div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[o.status] ?? ""}`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <ul className="mt-2 text-sm text-muted-foreground space-y-0.5">
                {(o.items as any[]).map((it, idx) => (
                  <li key={idx}>
                    {it.quantity}x {it.name}
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-muted-foreground">
                {o.type === "delivery" ? "Entrega" : "Retirada"} ·{" "}
                {o.payment_method === "pix" ? "PIX" : o.payment_method === "money" ? "Dinheiro" : "Cartão"}
              </div>
            </Card>
          ))
        )}
      </main>
      <BottomNav />
    </div>
  );
}
