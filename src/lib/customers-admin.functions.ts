import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./authz.server";

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: customers, error } = await supabaseAdmin
      .from("customers")
      .select("id, phone, name, created_at, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const ids = (customers ?? []).map((c) => c.id);
    if (ids.length === 0) return { customers: [] };

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("customer_id, total, created_at")
      .in("customer_id", ids);

    const stats = new Map<string, { count: number; total: number; last: string | null }>();
    for (const o of orders ?? []) {
      if (!o.customer_id) continue;
      const s = stats.get(o.customer_id) ?? { count: 0, total: 0, last: null };
      s.count += 1;
      s.total += Number(o.total);
      if (!s.last || o.created_at > s.last) s.last = o.created_at;
      stats.set(o.customer_id, s);
    }

    return {
      customers: (customers ?? []).map((c) => {
        const s = stats.get(c.id) ?? { count: 0, total: 0, last: null };
        return {
          ...c,
          order_count: s.count,
          total_spent: s.total,
          avg_ticket: s.count > 0 ? s.total / s.count : 0,
          last_order_at: s.last,
        };
      }),
    };
  });

export const getCustomerOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("customer_id", data.customerId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { orders: orders ?? [] };
  });
