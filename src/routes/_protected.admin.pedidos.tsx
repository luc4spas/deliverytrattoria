import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PaginationBar, paginate } from "@/components/admin/PaginationBar";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Bell, BellOff, ChevronRight, Clock, MapPin, Phone, Printer, Search, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ensureQzConnected, printOrderReceipts, type PrintOrder } from "@/lib/qz-print";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Status = Order["status"];

const STATUS_LABEL: Record<Status, string> = {
  new: "Novos",
  preparing: "Em preparo",
  out_for_delivery: "Saiu p/ entrega",
  done: "Concluído",
  cancelled: "Cancelado",
};

const KANBAN_COLUMNS: { status: Status; color: string }[] = [
  { status: "new", color: "border-t-primary" },
  { status: "preparing", color: "border-t-amber-500" },
  { status: "out_for_delivery", color: "border-t-blue-500" },
  { status: "done", color: "border-t-emerald-500" },
];

const NEXT_STATUS: Partial<Record<Status, Status>> = {
  new: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "done",
};

const NEXT_LABEL: Partial<Record<Status, string>> = {
  new: "Aceitar",
  preparing: "Saiu p/ entrega",
  out_for_delivery: "Concluir",
};

// Beep simples via WebAudio (sem assets)
function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    osc.start();
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close(), 800);
  } catch {}
}

export const Route = createFileRoute("/_protected/admin/pedidos")({
  component: OrdersPage,
});

function OrdersPage() {
  const qc = useQueryClient();
  const { isKitchen } = useAuth();
  const { data: settings } = useSettings();
  const [tab, setTab] = useState<"kanban" | "historico">("kanban");
  const [soundOn, setSoundOn] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSoundOn(localStorage.getItem("orders.sound") !== "off");
    }
  }, []);
  const [selected, setSelected] = useState<Order | null>(null);
  const [histSearch, setHistSearch] = useState("");
  const [histStatus, setHistStatus] = useState<string>("all");
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(20);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    localStorage.setItem("orders.sound", soundOn ? "on" : "off");
  }, [soundOn]);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Order[];
    },
  });

  // Detectar novos pedidos e notificar
  useEffect(() => {
    if (firstLoad.current) {
      orders.forEach((o) => knownIds.current.add(o.id));
      firstLoad.current = false;
      return;
    }
    const novos = orders.filter((o) => !knownIds.current.has(o.id) && o.status === "new");
    if (novos.length > 0) {
      novos.forEach((o) => knownIds.current.add(o.id));
      toast.success(`${novos.length} novo${novos.length > 1 ? "s" : ""} pedido${novos.length > 1 ? "s" : ""}!`, {
        description: novos.map((o) => o.customer_name).join(", "),
      });
      if (typeof document !== "undefined") {
        const original = document.title;
        document.title = `🔔 (${novos.length}) Novo pedido`;
        setTimeout(() => { document.title = original; }, 4000);
      }
    }
    orders.forEach((o) => knownIds.current.add(o.id));
  }, [orders]);

  // Toca o aviso sonoro em loop enquanto existir pedido com status "new"
  const hasPendingNew = orders.some((o) => o.status === "new");
  useEffect(() => {
    if (!soundOn || !hasPendingNew) return;
    playBeep();
    const id = setInterval(() => playBeep(), 2500);
    return () => clearInterval(id);
  }, [soundOn, hasPendingNew]);


  useEffect(() => {
    const channel = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Tenta conectar ao QZ Tray ao abrir a página (silencioso)
  useEffect(() => {
    if (isKitchen || !settings?.auto_print_enabled) return;
    ensureQzConnected().catch(() => {
      toast.warning("QZ Tray não detectado", {
        description: "Abra o programa de impressão no computador para imprimir automaticamente.",
      });
    });
  }, [isKitchen, settings?.auto_print_enabled]);

  const printOrder = async (order: Order, silent = false) => {
    try {
      const res = await printOrderReceipts(order as unknown as PrintOrder, {
        storeName: settings?.name ?? "Restaurante",
        cashierPrinter: (settings as any)?.cashier_printer_name,
        kitchenPrinter: (settings as any)?.kitchen_printer_name,
      });
      if (res.cashier || res.kitchen) {
        toast.success(`Impressão enviada (${[res.cashier && "Caixa", res.kitchen && "Cozinha"].filter(Boolean).join(" + ")})`);
      }
      if (res.errors.length) {
        toast.error(res.errors.join(" · "));
      }
    } catch (e: any) {
      if (!silent) {
        toast.error(e.message ?? "Falha ao imprimir");
      } else {
        toast.warning(e.message ?? "Falha ao imprimir", {
          action: { label: "Tentar de novo", onClick: () => printOrder(order, false) },
        });
      }
    }
  };

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      // Auto-print quando aceita um pedido (new -> preparing)
      if (!isKitchen && variables.status === "preparing" && settings?.auto_print_enabled) {
        const order = orders.find((o) => o.id === variables.id);
        if (order) printOrder(order, true);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const g: Record<Status, Order[]> = {
      new: [], preparing: [], out_for_delivery: [], done: [], cancelled: [],
    };
    orders.forEach((o) => g[o.status]?.push(o));
    return g;
  }, [orders]);

  const historicFiltered = useMemo(() => {
    const q = histSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (histStatus !== "all" && o.status !== histStatus) return false;
      if (!q) return true;
      return (
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [orders, histSearch, histStatus]);

  useEffect(() => { setHistPage(1); }, [histSearch, histStatus, histPageSize]);
  const historicPage = paginate(historicFiltered, { page: histPage, pageSize: histPageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Kanban em tempo real com notificação sonora.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={soundOn ? "default" : "outline"}
            size="sm"
            onClick={() => { setSoundOn((s) => !s); if (!soundOn) playBeep(); }}
            title="Ativar/desativar som de novos pedidos"
          >
            {soundOn ? <Bell className="size-4 mr-1.5" /> : <BellOff className="size-4 mr-1.5" />}
            Som {soundOn ? "ligado" : "desligado"}
          </Button>
        </div>
      </div>

      <Tabs value={isKitchen ? "kanban" : tab} onValueChange={(v) => setTab(v as any)}>
        {!isKitchen && (
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {KANBAN_COLUMNS.map((col) => {
              const list = grouped[col.status] ?? [];
              return (
                <div key={col.status} className={`rounded-lg border border-t-4 ${col.color} bg-muted/30 flex flex-col min-h-[300px]`}>
                  <div className="p-3 flex items-center justify-between border-b bg-background/60 rounded-t-md">
                    <div className="font-semibold text-sm">{STATUS_LABEL[col.status]}</div>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <div className="p-2 space-y-2 flex-1">
                    {list.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6">Vazio</div>
                    ) : list.map((o) => (
                      <KanbanCard
                        key={o.id}
                        order={o}
                        onOpen={() => setSelected(o)}
                        onAdvance={() => {
                          const next = NEXT_STATUS[o.status];
                          if (next) update.mutate({ id: o.id, status: next });
                        }}
                        onCancel={() => update.mutate({ id: o.id, status: "cancelled" })}
                        onReprint={() => printOrder(o, false)}
                        kitchenMode={isKitchen}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, telefone ou #id"
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={histStatus} onValueChange={setHistStatus}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card className="p-2">
            <div className="divide-y">
              {historicPage.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhum pedido.</div>
              )}
              {historicPage.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">#{o.id.slice(0, 6).toUpperCase()}</span>
                      <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[o.status]}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="text-sm truncate">{o.customer_name} · {o.customer_phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{brl(Number(o.total))}</div>
                    <ChevronRight className="size-4 text-muted-foreground ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
          <PaginationBar
            page={histPage}
            pageSize={histPageSize}
            total={historicFiltered.length}
            onPageChange={setHistPage}
            onPageSizeChange={setHistPageSize}
          />
        </TabsContent>
      </Tabs>


      <OrderDialog
        order={selected}
        onClose={() => setSelected(null)}
        onChangeStatus={(status) => selected && update.mutate({ id: selected.id, status })}
        kitchenMode={isKitchen}
      />
    </div>
  );
}

function KanbanCard({
  order, onOpen, onAdvance, onCancel, onReprint, kitchenMode,
}: {
  order: Order;
  onOpen: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  onReprint: () => void;
  kitchenMode: boolean;
}) {
  const items = (order.items as Array<{ name: string; quantity: number }>) ?? [];
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));
  const nextLabel = NEXT_LABEL[order.status];
  const canReprint = order.status !== "new" && order.status !== "cancelled";
  return (
    <Card className="p-3 cursor-pointer hover:shadow-md transition" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">#{order.id.slice(0, 6).toUpperCase()} · {order.customer_name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="size-3" /> {minutes} min · {order.type === "delivery" ? "Entrega" : "Retirada"}
          </div>
        </div>
        <div className="text-sm font-bold text-primary whitespace-nowrap">{brl(Number(order.total))}</div>
      </div>
      <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 line-clamp-3">
        {items.slice(0, 3).map((it, i) => (
          <li key={i}>{it.quantity}× {it.name}</li>
        ))}
        {items.length > 3 && <li>+{items.length - 3} item(ns)</li>}
      </ul>
      {(nextLabel || order.status !== "cancelled") && (
        <div className="mt-3 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {nextLabel && (
            <Button size="sm" className="flex-1" onClick={onAdvance}>{nextLabel}</Button>
          )}
          {!kitchenMode && order.status === "new" && (
            <Button size="sm" variant="outline" onClick={onCancel}>Recusar</Button>
          )}
          {!kitchenMode && canReprint && (
            <Button size="sm" variant="outline" onClick={onReprint} title="Reimprimir vias">
              <Printer className="size-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function OrderDialog({
  order, onClose, onChangeStatus, kitchenMode,
}: {
  order: Order | null;
  onClose: () => void;
  onChangeStatus: (s: Status) => void;
  kitchenMode: boolean;
}) {
  if (!order) return null;
  const items = (order.items as Array<{ name: string; quantity: number; price: number; notes?: string }>) ?? [];
  const addr = order.address as { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string } | null;
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedido #{order.id.slice(0, 8).toUpperCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> {order.customer_name}</div>
          <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {order.customer_phone}</div>
          {addr && (
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-muted-foreground mt-0.5" />
              <span>
                {addr.street}, {addr.number}
                {addr.complement ? ` - ${addr.complement}` : ""}
                {addr.neighborhood ? ` · ${addr.neighborhood}` : ""}
                {addr.city ? ` - ${addr.city}` : ""}
              </span>
            </div>
          )}
          <div className="border-t pt-3 space-y-1">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span>{it.quantity}× {it.name}{it.notes ? ` (${it.notes})` : ""}</span>
                <span>{brl(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{brl(Number(order.subtotal))}</span></div>
            <div className="flex justify-between"><span>Entrega</span><span>{brl(Number(order.delivery_fee))}</span></div>
            <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{brl(Number(order.total))}</span></div>
          </div>
          <div className="text-xs text-muted-foreground">
            Pagamento: {order.payment_method}{order.change_for ? ` · Troco para ${brl(Number(order.change_for))}` : ""}
          </div>
          {order.notes && <div className="text-xs bg-muted p-2 rounded">Obs: {order.notes}</div>}
          <div className="border-t pt-3">
            <label className="text-xs text-muted-foreground">Alterar status</label>
            <Select value={order.status} onValueChange={(v) => onChangeStatus(v as Status)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as Status[])
                  .filter((s) => !kitchenMode || s !== "cancelled")
                  .map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
