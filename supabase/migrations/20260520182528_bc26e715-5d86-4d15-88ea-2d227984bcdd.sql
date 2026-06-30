ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS cashier_printer_name text,
  ADD COLUMN IF NOT EXISTS kitchen_printer_name text,
  ADD COLUMN IF NOT EXISTS auto_print_enabled boolean NOT NULL DEFAULT false;