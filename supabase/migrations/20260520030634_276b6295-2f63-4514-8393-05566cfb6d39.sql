
-- Dedicated table for WhatsApp/Evolution API integration (admin-only).
-- Kept separate from restaurant_settings because that table is public-readable
-- and these credentials must NEVER be exposed to anonymous clients.
CREATE TABLE public.whatsapp_integration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'evolution',
  base_url text,
  api_key text,
  instance text,
  is_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_integration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage whatsapp integration"
  ON public.whatsapp_integration
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed a single row so the admin UI always edits the same record
INSERT INTO public.whatsapp_integration (provider, is_enabled) VALUES ('evolution', false);
