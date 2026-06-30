
-- 1.1 Política Híbrida de Leitura para orders
DROP POLICY IF EXISTS "admins view orders" ON public.orders;
DROP POLICY IF EXISTS "View orders policy" ON public.orders;
CREATE POLICY "View orders policy" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'kitchen'::app_role)
    OR customer_id = auth.uid()
  );

-- 1.2 Update orders restrito a admin/cozinha
DROP POLICY IF EXISTS "admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Manage orders policy" ON public.orders;
CREATE POLICY "Manage orders policy" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'kitchen'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'kitchen'::app_role));

-- 1.3 Blindagem WhatsApp
ALTER TABLE public.whatsapp_integration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage whatsapp integration" ON public.whatsapp_integration;
CREATE POLICY "admins manage whatsapp integration" ON public.whatsapp_integration
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 1.4 Segurança function has_role
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 1.5 Sessões de cliente
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers can view own sessions" ON public.customer_sessions;
CREATE POLICY "Customers can view own sessions" ON public.customer_sessions
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

-- Realtime: restringir broadcasts de orders
-- Bloquear acesso à tabela realtime.messages para anon; só admin/kitchen recebem
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins and kitchen can receive realtime" ON realtime.messages;
CREATE POLICY "Admins and kitchen can receive realtime" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'kitchen'::app_role)
  );
