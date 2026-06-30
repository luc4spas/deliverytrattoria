import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_protected/admin/")({
  component: Dashboard,
});

type Range = "week" | "month";

const IFOOD_COMMISSION = 0.23; // taxa média estimada

function startOf(range: Range): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
  } else {
    d.setDate(1);
  }
  return d;
}

function previousRange(range: Range): { start: Date; end: Date } {
  const start = startOf(range);
  const end = new Date(start);
  if (range === "week") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setMonth(start.getMonth() - 1);
  }
  return { start, end };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function Dashboard() {
  const [range, setRange] = useState<Range>("month");

  const { data: settings } = useQuery({
    queryKey: ["dash-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_settings").select("name,is_open").maybeSingle();
      return data;
    },
  });

  const { data } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: async () => {
      const currStart = startOf(range);
      const prev = previousRange(range);

      // 6 meses para o gráfico
      const sixStart = new Date();
      sixStart.setMonth(sixStart.getMonth() - 5);
      sixStart.setDate(1);
      sixStart.setHours(0, 0, 0, 0);

      const [{ data: curr }, { data: prevData }, { data: six }] = await Promise.all([
        supabase.from("orders").select("total,items,created_at").gte("created_at", currStart.toISOString()),
        supabase
          .from("orders")
          .select("total,created_at")
          .gte("created_at", prev.start.toISOString())
          .lt("created_at", prev.end.toISOString()),
        supabase.from("orders").select("total,created_at").gte("created_at", sixStart.toISOString()),
      ]);

      const list = curr ?? [];
      const total = list.reduce((s, o) => s + Number(o.total), 0);
      const count = list.length;
      const avg = count ? total / count : 0;
      const savings = total * IFOOD_COMMISSION;

      const prevList = prevData ?? [];
      const prevTotal = prevList.reduce((s, o) => s + Number(o.total), 0);
      const prevCount = prevList.length;
      const revPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
      const cntPct = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : null;
      const prevAvg = prevCount ? prevTotal / prevCount : 0;

      // top products
      const byProduct = new Map<string, { name: string; count: number; revenue: number }>();
      for (const o of list) {
        const items = Array.isArray(o.items) ? (o.items as any[]) : [];
        for (const it of items) {
          const name = it?.name ?? "Item";
          const qty = Number(it?.quantity ?? it?.qty ?? 1);
          const price = Number(it?.price ?? it?.unitPrice ?? 0) * qty;
          const e = byProduct.get(name) ?? { name, count: 0, revenue: 0 };
          e.count += qty;
          e.revenue += price;
          byProduct.set(name, e);
        }
      }
      const topProducts = Array.from(byProduct.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      // 6 month chart
      const monthly = new Map<string, number>();
      for (const o of six ?? []) {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthly.set(key, (monthly.get(key) ?? 0) + Number(o.total));
      }
      const chart: { month: string; own: number; ifood: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const own = monthly.get(key) ?? 0;
        chart.push({
          month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          own,
          ifood: own * 0.45, // estimativa visual do que seria via iFood
        });
      }

      return { total, count, avg, savings, revPct, cntPct, prevAvg, topProducts, chart };
    },
  });

  const userName = useMemo(() => settings?.name?.split(" ")[0] ?? "", [settings]);
  const productColors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];

  const kpis = [
    {
      label: "Faturamento",
      value: brl(data?.total ?? 0),
      delta: data?.revPct,
      tone: "text-foreground",
    },
    {
      label: "Pedidos",
      value: String(data?.count ?? 0),
      delta: data?.cntPct,
      tone: "text-foreground",
    },
    {
      label: "Economia comissão",
      value: brl(data?.savings ?? 0),
      sub: range === "month" ? "do iFood este mês" : "do iFood",
      tone: "text-primary",
    },
    {
      label: "Ticket médio",
      value: brl(data?.avg ?? 0),
      sub: `vs ${brl(data?.prevAvg ?? 0)} período anterior`,
      tone: "text-success",
    },
  ];

  return (
    <div className="-m-4 sm:-m-8 min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-background text-foreground p-4 sm:p-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {greeting()}{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{formatDate(new Date())}</p>
        </div>
        <div className="flex items-center gap-2">
          {settings?.is_open && (
            <span className="hidden sm:inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary">
              ABERTO AGORA
            </span>
          )}
          <div className="inline-flex rounded-md border bg-card p-1">
            <button
              onClick={() => setRange("week")}
              className={`px-3 py-1.5 text-xs rounded ${range === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Esta semana
            </button>
            <button
              onClick={() => setRange("month")}
              className={`px-3 py-1.5 text-xs rounded ${range === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Este mês
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className={`mt-2 text-2xl sm:text-3xl font-bold ${k.tone}`}>{k.value}</div>
            {k.delta != null && (
              <div className={`mt-1 text-xs ${k.delta >= 0 ? "text-success" : "text-destructive"}`}>
                {k.delta >= 0 ? "+" : ""}
                {k.delta.toFixed(0)}% vs anterior
              </div>
            )}
            {k.sub && <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-semibold">Receita por canal</div>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-foreground/80">
                  <span className="size-2 rounded-full bg-primary" /> Canal próprio
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted-foreground/50" /> iFood (estimado)
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Últimos 6 meses</div>
          </div>
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chart ?? []} barCategoryGap="22%">
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`)}
                />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="ifood" fill="color-mix(in oklab, var(--muted-foreground) 40%, transparent)" radius={[4, 4, 0, 0]} name="iFood" />
                <Bar dataKey="own" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Canal próprio" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="font-semibold mb-4">Mais pedidos</div>
          {(data?.topProducts ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Sem pedidos no período</div>
          ) : (
            <div className="space-y-3">
              {data!.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="size-9 rounded-md shrink-0" style={{ background: productColors[i % 4] }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.count} pedidos</div>
                  </div>
                  <div className="text-sm font-bold text-primary whitespace-nowrap">
                    {p.revenue >= 1000 ? `R$${(p.revenue / 1000).toFixed(1)}k` : brl(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
