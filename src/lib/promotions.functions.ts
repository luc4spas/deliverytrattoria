import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(1).max(40),
        subtotal: z.number().min(0),
        delivery_fee: z.number().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const { data: c, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .ilike("code", code)
      .maybeSingle();
    if (error) throw error;
    if (!c) throw new Error("Cupom não encontrado");
    if (!c.is_active) throw new Error("Cupom inativo");
    const now = new Date();
    if (c.valid_from && new Date(c.valid_from) > now) throw new Error("Cupom ainda não disponível");
    if (c.valid_until && new Date(c.valid_until) < now) throw new Error("Cupom expirado");
    if (c.max_uses != null && c.uses >= c.max_uses) throw new Error("Cupom esgotado");
    if (Number(data.subtotal) < Number(c.min_order_value)) {
      throw new Error(
        `Pedido mínimo de R$ ${Number(c.min_order_value).toFixed(2)} para usar este cupom`,
      );
    }
    return {
      id: c.id as string,
      code: c.code as string,
      description: (c.description as string | null) ?? null,
      discount_type: c.discount_type as "fixed" | "percent" | "free_shipping",
      discount_value: Number(c.discount_value),
      min_order_value: Number(c.min_order_value),
    };
  });
