import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PaginationBar, paginate } from "@/components/admin/PaginationBar";
import { listCustomers, getCustomerOrders } from "@/lib/customers-admin.functions";
import { brl, onlyDigits } from "@/lib/format";
import { MessageCircle, Search } from "lucide-react";

export const Route = createFileRoute("/_protected/admin/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const fetchCustomers = useServerFn(listCustomers);
  const fetchOrders = useServerFn(getCustomerOrders);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers(),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["admin-customer-orders", selectedId],
    queryFn: () => fetchOrders({ data: { customerId: selectedId! } }),
    enabled: !!selectedId,
  });

  const customers = data?.customers ?? [];
  const selected = customers.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        c.phone.includes(onlyDigits(q)),
    );
  }, [customers, search]);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  const pageItems = paginate(filtered, { page, pageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} cliente{customers.length === 1 ? "" : "s"} cadastrado{customers.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="relative w-72 max-w-full">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {customers.length === 0
              ? "Nenhum cliente fez login ainda."
              : "Nenhum cliente encontrado."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">WhatsApp</th>
                  <th className="text-right p-3">Pedidos</th>
                  <th className="text-right p-3">Total gasto</th>
                  <th className="text-right p-3">Ticket médio</th>
                  <th className="text-left p-3">Último pedido</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{formatPhone(c.phone)}</td>
                    <td className="p-3 text-right">{c.order_count}</td>
                    <td className="p-3 text-right">{brl(c.total_spent)}</td>
                    <td className="p-3 text-right">{brl(c.avg_ticket)}</td>
                    <td className="p-3 text-muted-foreground">
                      {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(c.id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />


      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name || "Cliente"}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">WhatsApp</div>
                  <div className="font-medium">{formatPhone(selected.phone)}</div>
                </div>
                <a
                  href={`https://wa.me/${selected.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg"
                >
                  <MessageCircle className="size-4" /> Abrir WhatsApp
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat label="Pedidos" value={String(selected.order_count)} />
                <Stat label="Total" value={brl(selected.total_spent)} />
                <Stat label="Médio" value={brl(selected.avg_ticket)} />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Histórico</h3>
                <div className="space-y-2">
                  {(ordersData?.orders ?? []).map((o: any) => (
                    <div key={o.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">
                          {new Date(o.created_at).toLocaleString("pt-BR")}
                        </span>
                        <span className="font-semibold">{brl(Number(o.total))}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(o.items as any[]).map((it) => `${it.quantity}x ${it.name}`).join(" · ")}
                      </div>
                    </div>
                  ))}
                  {ordersData?.orders.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sem pedidos.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function formatPhone(p: string) {
  // 5511999999999 -> +55 (11) 99999-9999
  if (p.length === 13 && p.startsWith("55")) {
    return `+55 (${p.slice(2, 4)}) ${p.slice(4, 9)}-${p.slice(9)}`;
  }
  if (p.length === 12 && p.startsWith("55")) {
    return `+55 (${p.slice(2, 4)}) ${p.slice(4, 8)}-${p.slice(8)}`;
  }
  return p;
}
