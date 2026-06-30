
-- Enums
CREATE TYPE public.product_type AS ENUM ('simple', 'pizza_flavor');
CREATE TYPE public.category_kind AS ENUM ('regular', 'pizza');

-- Alter products
ALTER TABLE public.products
  ADD COLUMN product_type public.product_type NOT NULL DEFAULT 'simple',
  ADD COLUMN addons jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Alter categories
ALTER TABLE public.categories
  ADD COLUMN kind public.category_kind NOT NULL DEFAULT 'regular';

-- pizza_sizes
CREATE TABLE public.pizza_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slices integer NOT NULL DEFAULT 8,
  max_flavors integer NOT NULL DEFAULT 2,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pizza_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can view pizza sizes" ON public.pizza_sizes FOR SELECT USING (true);
CREATE POLICY "admins manage pizza sizes" ON public.pizza_sizes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- pizza_crusts
CREATE TABLE public.pizza_crusts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pizza_crusts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can view pizza crusts" ON public.pizza_crusts FOR SELECT USING (true);
CREATE POLICY "admins manage pizza crusts" ON public.pizza_crusts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- pizza_flavor_prices
CREATE TABLE public.pizza_flavor_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size_id)
);
CREATE INDEX idx_flavor_prices_product ON public.pizza_flavor_prices(product_id);
CREATE INDEX idx_flavor_prices_size ON public.pizza_flavor_prices(size_id);
ALTER TABLE public.pizza_flavor_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can view flavor prices" ON public.pizza_flavor_prices FOR SELECT USING (true);
CREATE POLICY "admins manage flavor prices" ON public.pizza_flavor_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed sizes
INSERT INTO public.pizza_sizes (name, slices, max_flavors, sort_order) VALUES
  ('Pequena', 4, 1, 1),
  ('Média', 6, 2, 2),
  ('Grande', 8, 2, 3),
  ('Família', 12, 3, 4);

-- Seed crusts
INSERT INTO public.pizza_crusts (name, price, sort_order) VALUES
  ('Sem borda', 0, 1),
  ('Catupiry', 8, 2),
  ('Cheddar', 8, 3),
  ('Chocolate', 10, 4);
