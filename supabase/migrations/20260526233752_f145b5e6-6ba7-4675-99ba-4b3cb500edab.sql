CREATE TABLE public.combo_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  min_choices integer NOT NULL DEFAULT 1,
  max_choices integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.combo_steps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_steps TO authenticated;
GRANT ALL ON public.combo_steps TO service_role;

ALTER TABLE public.combo_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view combo steps" ON public.combo_steps FOR SELECT USING (true);
CREATE POLICY "admins manage combo steps" ON public.combo_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.combo_step_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id uuid NOT NULL REFERENCES public.combo_steps(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id uuid REFERENCES public.pizza_sizes(id) ON DELETE SET NULL,
  extra_price numeric(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.combo_step_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_step_items TO authenticated;
GRANT ALL ON public.combo_step_items TO service_role;

ALTER TABLE public.combo_step_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view combo step items" ON public.combo_step_items FOR SELECT USING (true);
CREATE POLICY "admins manage combo step items" ON public.combo_step_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_combo_steps_product ON public.combo_steps(product_id);
CREATE INDEX idx_combo_step_items_step ON public.combo_step_items(step_id);