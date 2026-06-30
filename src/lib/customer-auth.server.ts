import { createHash, randomBytes, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const COOKIE_NAME = "customer_session";
export const SESSION_DAYS = 30;
export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  // assume BR if 10-11 digits without country code
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export const genOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const genToken = () => randomBytes(32).toString("hex");

export async function sendOtpViaEvolution(phone: string, code: string) {
  // Read integration config from DB so each restaurant can set its own
  // Evolution API credentials from the admin Settings page.
  const { data: cfg } = await supabaseAdmin
    .from("whatsapp_integration")
    .select("base_url, api_key, instance, is_enabled")
    .limit(1)
    .maybeSingle();

  // Fallback to env vars (legacy) if DB row is incomplete
  const base = (cfg?.base_url ?? process.env.EVOLUTION_BASE_URL ?? "").trim();
  const key = (cfg?.api_key ?? process.env.EVOLUTION_API_KEY ?? "").trim();
  const instance = (cfg?.instance ?? process.env.EVOLUTION_INSTANCE ?? "").trim();
  const enabled = cfg?.is_enabled ?? true;

  if (!enabled) throw new Error("Integração WhatsApp desativada nas Configurações");
  if (!base || !key || !instance) throw new Error("Evolution API não configurada. Vá em Configurações → Integração WhatsApp.");

  const url = `${base.replace(/\/$/, "")}/message/sendText/${instance}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({
      number: phone,
      text: `Seu código de acesso é *${code}*\n\nVálido por ${OTP_TTL_MIN} minutos. Se não foi você, ignore esta mensagem.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution API falhou [${res.status}]: ${body.slice(0, 200)}`);
  }
}

export async function getCustomerFromToken(token: string | undefined) {
  if (!token) return null;
  const hash = sha256(token);
  const { data: session } = await supabaseAdmin
    .from("customer_sessions")
    .select("id, customer_id, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await supabaseAdmin.from("customer_sessions").delete().eq("id", session.id);
    return null;
  }
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, phone, name")
    .eq("id", session.customer_id)
    .maybeSingle();
  if (!customer) return null;
  // refresh last_used_at (fire-and-forget)
  void supabaseAdmin
    .from("customer_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", session.id);
  return { sessionId: session.id, ...customer };
}
