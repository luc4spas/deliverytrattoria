// Pure helpers shared between client estimate and server authoritative calc.

export type CouponDiscountType = "fixed" | "percent" | "free_shipping";
export type AutoDiscountType = "fixed" | "percent";

export type CouponLike = {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_value: number;
};

export type AutoPromotionLike = {
  id: string;
  name: string;
  discount_type: AutoDiscountType;
  discount_value: number;
  category_id: string | null;
  min_order_value: number;
  days_of_week: number[];
  valid_from?: string | null;
  valid_until?: string | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Returns discount amount (always positive, applied to subtotal) and
 * whether the coupon zeroes the delivery fee.
 */
export function computeCouponDiscount(
  c: CouponLike,
  subtotal: number,
  deliveryFee: number,
): { discount: number; freeShipping: boolean } {
  if (subtotal < Number(c.min_order_value)) return { discount: 0, freeShipping: false };
  if (c.discount_type === "free_shipping") {
    return { discount: r2(Math.max(0, deliveryFee)), freeShipping: true };
  }
  if (c.discount_type === "percent") {
    const v = Math.max(0, Math.min(100, Number(c.discount_value)));
    return { discount: r2((subtotal * v) / 100), freeShipping: false };
  }
  // fixed
  return { discount: r2(Math.min(subtotal, Math.max(0, Number(c.discount_value)))), freeShipping: false };
}

export function computeAutoDiscount(
  p: AutoPromotionLike,
  subtotal: number,
  eligibleSubtotal: number,
): number {
  if (subtotal < Number(p.min_order_value)) return 0;
  const base = p.category_id ? eligibleSubtotal : subtotal;
  if (base <= 0) return 0;
  if (p.discount_type === "percent") {
    const v = Math.max(0, Math.min(100, Number(p.discount_value)));
    return r2((base * v) / 100);
  }
  return r2(Math.min(base, Math.max(0, Number(p.discount_value))));
}

export function isAutoPromotionActiveNow(p: AutoPromotionLike, now: Date = new Date()): boolean {
  const dow = now.getDay();
  if (!Array.isArray(p.days_of_week) || !p.days_of_week.includes(dow)) return false;
  if (p.valid_from && new Date(p.valid_from) > now) return false;
  if (p.valid_until && new Date(p.valid_until) < now) return false;
  return true;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
] as const;
