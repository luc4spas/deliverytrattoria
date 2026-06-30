
-- Add image_url + prep time to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS prep_time_minutes integer;

-- Extend category_kind: pizza_doce + combo (existing 'pizza' = salgada)
ALTER TYPE public.category_kind ADD VALUE IF NOT EXISTS 'pizza_doce';
ALTER TYPE public.category_kind ADD VALUE IF NOT EXISTS 'combo';

-- Extend product_type: combo
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'combo';

-- Combo items column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS combo_items jsonb NOT NULL DEFAULT '[]'::jsonb;
