
-- 1. Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('fixed','percent','free_shipping')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view active coupons"
  ON public.coupons FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX coupons_code_idx ON public.coupons (lower(code));

-- 2. Automatic promotions
CREATE TABLE public.automatic_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value numeric NOT NULL DEFAULT 0,
  days_of_week smallint[] NOT NULL DEFAULT '{}'::smallint[],
  category_id uuid,
  min_order_value numeric NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automatic_promotions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automatic_promotions TO authenticated;
GRANT ALL ON public.automatic_promotions TO service_role;

ALTER TABLE public.automatic_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view active automatic promotions"
  ON public.automatic_promotions FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "admins manage automatic promotions"
  ON public.automatic_promotions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Orders columns
ALTER TABLE public.orders
  ADD COLUMN discount_applied numeric NOT NULL DEFAULT 0,
  ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;
