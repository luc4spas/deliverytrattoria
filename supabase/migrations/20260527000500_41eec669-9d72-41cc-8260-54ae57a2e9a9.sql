ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kitchen';

-- Leitura híbrida de pedidos: admin, cozinha/KDS e o próprio cliente autenticado.
DROP POLICY IF EXISTS "admins view orders" ON public.orders;
DROP POLICY IF EXISTS "View orders policy" ON public.orders;
CREATE POLICY "View orders policy"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'kitchen'::public.app_role)
  OR customer_id = auth.uid()
);

-- Alteração de pedidos: apenas admin e cozinha/KDS podem avançar status/produção.
DROP POLICY IF EXISTS "admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Manage orders policy" ON public.orders;
CREATE POLICY "Manage orders policy"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'kitchen'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'kitchen'::public.app_role)
);

-- Pedidos agora devem ser criados pelo servidor, com validação, não por escrita pública direta.
DROP POLICY IF EXISTS "anyone can create order" ON public.orders;

-- Blindagem da integração do WhatsApp.
ALTER TABLE public.whatsapp_integration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage whatsapp integration" ON public.whatsapp_integration;
CREATE POLICY "admins manage whatsapp integration"
ON public.whatsapp_integration
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Segurança da função de papéis usada nas políticas RLS.
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Sessões de clientes: somente o próprio cliente autenticado pode visualizar.
DROP POLICY IF EXISTS "Customers can view own sessions" ON public.customer_sessions;
CREATE POLICY "Customers can view own sessions"
ON public.customer_sessions
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- OTPs são usados apenas por funções de servidor; nenhum acesso direto pelo app.
ALTER TABLE public.customer_otp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct customer otp access" ON public.customer_otp;
CREATE POLICY "No direct customer otp access"
ON public.customer_otp
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);