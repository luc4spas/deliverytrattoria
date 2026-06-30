
-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view customers" ON public.customers
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update customers" ON public.customers
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- OTP codes
CREATE TABLE public.customer_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_otp_phone_idx ON public.customer_otp(phone, created_at DESC);
ALTER TABLE public.customer_otp ENABLE ROW LEVEL SECURITY;
-- no policies = no client access (service role bypasses RLS)

-- Sessions
CREATE TABLE public.customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_sessions_token_idx ON public.customer_sessions(token_hash);
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
-- no policies = no client access

-- Link orders to customers
ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX orders_customer_id_idx ON public.orders(customer_id);
