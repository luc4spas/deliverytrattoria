import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  COOKIE_NAME,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MIN,
  SESSION_DAYS,
  genOtp,
  genToken,
  getCustomerFromToken,
  normalizePhone,
  sendOtpViaEvolution,
  sha256,
} from "./customer-auth.server";

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ phone: z.string().min(10).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (phone.length < 12) throw new Error("Número inválido");

    // simple rate limit: no more than 1 OTP per 60s per phone
    const { data: recent } = await supabaseAdmin
      .from("customer_otp")
      .select("created_at")
      .eq("phone", phone)
      .gt("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1);
    if (recent && recent.length > 0) {
      throw new Error("Aguarde 1 minuto para pedir outro código");
    }

    const code = genOtp();
    const expires = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();
    const { error } = await supabaseAdmin.from("customer_otp").insert({
      phone,
      code_hash: sha256(code),
      expires_at: expires,
    });
    if (error) throw error;

    await sendOtpViaEvolution(phone, code);
    return { ok: true, phone };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        phone: z.string().min(10).max(20),
        code: z.string().regex(/^\d{6}$/),
        name: z.string().trim().min(1).max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const { data: otp } = await supabaseAdmin
      .from("customer_otp")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) throw new Error("Código não encontrado. Peça um novo.");
    if (new Date(otp.expires_at) < new Date()) throw new Error("Código expirado");
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new Error("Muitas tentativas. Peça um novo código.");

    if (otp.code_hash !== sha256(data.code)) {
      await supabaseAdmin
        .from("customer_otp")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      throw new Error("Código incorreto");
    }

    await supabaseAdmin
      .from("customer_otp")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id);

    // upsert customer
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, name")
      .eq("phone", phone)
      .maybeSingle();

    let customerId: string;
    if (existing) {
      customerId = existing.id;
      await supabaseAdmin
        .from("customers")
        .update({
          last_seen_at: new Date().toISOString(),
          ...(data.name && !existing.name ? { name: data.name } : {}),
        })
        .eq("id", customerId);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("customers")
        .insert({ phone, name: data.name ?? null })
        .select("id")
        .single();
      if (error) throw error;
      customerId = inserted.id;
    }

    // create session
    const token = genToken();
    const expires_at = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await supabaseAdmin.from("customer_sessions").insert({
      customer_id: customerId,
      token_hash: sha256(token),
      expires_at: expires_at.toISOString(),
    });

    setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    });

    return { ok: true, customerId };
  });

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  const me = await getCustomerFromToken(token);
  if (!me) return { customer: null };
  return { customer: { id: me.id, phone: me.phone, name: me.name } };
});

export const updateMyName = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const token = getCookie(COOKIE_NAME);
    const me = await getCustomerFromToken(token);
    if (!me) throw new Error("Não autenticado");
    await supabaseAdmin.from("customers").update({ name: data.name }).eq("id", me.id);
    return { ok: true };
  });

export const getMyOrders = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  const me = await getCustomerFromToken(token);
  if (!me) return { orders: [] };
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("customer_id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return { orders: data ?? [] };
});

export const logoutCustomer = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (token) {
    await supabaseAdmin.from("customer_sessions").delete().eq("token_hash", sha256(token));
  }
  deleteCookie(COOKIE_NAME, { path: "/" });
  return { ok: true };
});

export const placeOrderAsCustomer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        customer_name: z.string().trim().min(1).max(80),
        customer_phone: z.string().min(10).max(20),
        type: z.enum(["delivery", "pickup"]),
        address: z
          .object({
            street: z.string().max(120).optional(),
            number: z.string().max(10).optional(),
            neighborhood: z.string().max(80).optional(),
            complement: z.string().max(40).optional(),
          })
          .nullable(),
        payment_method: z.enum(["pix", "money", "card"]),
        change_for: z.number().nullable(),
        notes: z.string().max(300).nullable(),
        items: z.array(z.object({
          product_id: z.string().uuid(),
          name: z.string().min(1).max(160),
          price: z.number().min(0),
          quantity: z.number().int().min(1).max(50),
          notes: z.string().max(200).nullable().optional(),
          meta: z.any().nullable().optional(),
        })).min(1).max(50),
        subtotal: z.number().min(0),
        delivery_fee: z.number().min(0),
        total: z.number().min(0),
        coupon_code: z.string().trim().max(40).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const token = getCookie(COOKIE_NAME);
    const me = await getCustomerFromToken(token);

    const ids = [...new Set(data.items.map((item) => item.product_id))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, price, product_type, is_available, category_id")
      .in("id", ids);
    if (productsError) throw productsError;
    const productById = new Map((products ?? []).map((p) => [p.id, p]));
    let serverSubtotal = 0;
    // per-category subtotal for category-restricted auto promos
    const subtotalByCategory = new Map<string, number>();
    for (const item of data.items) {
      const product = productById.get(item.product_id);
      if (!product?.is_available) throw new Error("Item indisponível no cardápio");
      const serverPrice = product.product_type === "combo" ? Number(product.price) : Number(item.price);
      if (product.product_type === "simple" && Math.abs(serverPrice - Number(product.price)) > 0.01) {
        throw new Error("Preço inválido no pedido");
      }
      const line = serverPrice * item.quantity;
      serverSubtotal += line;
      if (product.category_id) {
        subtotalByCategory.set(
          product.category_id,
          (subtotalByCategory.get(product.category_id) ?? 0) + line,
        );
      }
    }

    if (Math.abs(serverSubtotal - data.subtotal) > 0.05) {
      throw new Error("Subtotal do pedido divergente. Atualize o carrinho e tente novamente.");
    }

    const serverDeliveryFee = data.type === "delivery" ? data.delivery_fee : 0;

    // ── Apply automatic promotion (first active match for today) ───────────
    const now = new Date();
    const dow = now.getDay();
    const nowIso = now.toISOString();
    const { data: autoPromos } = await supabaseAdmin
      .from("automatic_promotions")
      .select("id, discount_type, discount_value, category_id, min_order_value, days_of_week, valid_from, valid_until")
      .eq("is_active", true);
    let autoDiscount = 0;
    for (const p of autoPromos ?? []) {
      const days: number[] = Array.isArray(p.days_of_week) ? (p.days_of_week as number[]) : [];
      if (!days.includes(dow)) continue;
      if (p.valid_from && new Date(p.valid_from as string) > now) continue;
      if (p.valid_until && new Date(p.valid_until as string) < now) continue;
      if (serverSubtotal < Number(p.min_order_value ?? 0)) continue;
      const base = p.category_id
        ? subtotalByCategory.get(p.category_id as string) ?? 0
        : serverSubtotal;
      if (base <= 0) continue;
      const val = Number(p.discount_value);
      if (p.discount_type === "percent") {
        autoDiscount = Math.round((base * Math.max(0, Math.min(100, val))) ) / 100;
      } else {
        autoDiscount = Math.min(base, Math.max(0, val));
      }
      break;
    }

    // ── Apply coupon if provided ────────────────────────────────────────────
    let coupon: { id: string; uses: number; max_uses: number | null } | null = null;
    let couponDiscount = 0;
    let couponFreeShipping = false;
    const code = data.coupon_code?.trim().toUpperCase() ?? "";
    if (code) {
      const { data: c, error: cerr } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .ilike("code", code)
        .maybeSingle();
      if (cerr) throw cerr;
      if (!c) throw new Error("Cupom não encontrado");
      if (!c.is_active) throw new Error("Cupom inativo");
      if (c.valid_from && new Date(c.valid_from as string) > now) throw new Error("Cupom ainda não disponível");
      if (c.valid_until && new Date(c.valid_until as string) < now) throw new Error("Cupom expirado");
      if (c.max_uses != null && (c.uses as number) >= (c.max_uses as number)) throw new Error("Cupom esgotado");
      if (serverSubtotal < Number(c.min_order_value)) {
        throw new Error(`Pedido mínimo de R$ ${Number(c.min_order_value).toFixed(2)} para este cupom`);
      }
      coupon = { id: c.id as string, uses: c.uses as number, max_uses: (c.max_uses as number | null) ?? null };
      if (c.discount_type === "free_shipping") {
        couponFreeShipping = true;
        couponDiscount = Math.max(0, serverDeliveryFee);
      } else if (c.discount_type === "percent") {
        const v = Math.max(0, Math.min(100, Number(c.discount_value)));
        couponDiscount = Math.round((serverSubtotal * v)) / 100;
      } else {
        couponDiscount = Math.min(serverSubtotal, Math.max(0, Number(c.discount_value)));
      }
    }

    const cappedItemsDiscount = Math.min(serverSubtotal, autoDiscount + (couponFreeShipping ? 0 : couponDiscount));
    const totalDiscount = Math.round((cappedItemsDiscount + (couponFreeShipping ? Math.max(0, serverDeliveryFee) : 0)) * 100) / 100;
    const effectiveDelivery = couponFreeShipping ? 0 : serverDeliveryFee;
    const serverTotal = Math.round((serverSubtotal - cappedItemsDiscount + effectiveDelivery) * 100) / 100;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        type: data.type,
        address: data.address,
        payment_method: data.payment_method,
        change_for: data.change_for,
        notes: data.notes,
        items: data.items,
        subtotal: serverSubtotal,
        delivery_fee: effectiveDelivery,
        total: Math.max(0, serverTotal),
        discount_applied: totalDiscount,
        coupon_id: coupon?.id ?? null,
        customer_id: me?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (coupon) {
      await supabaseAdmin
        .from("coupons")
        .update({ uses: coupon.uses + 1 })
        .eq("id", coupon.id);
    }

    // Touch nowIso to keep linter happy when not used elsewhere
    void nowIso;

    return {
      id: order.id as string,
      total: Math.max(0, serverTotal),
      discount: totalDiscount,
      delivery_fee: effectiveDelivery,
    };
  });
