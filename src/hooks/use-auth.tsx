import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "kitchen";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isAdmin: boolean;
  isKitchen: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoading(true);
      setSession(s);
      if (s?.user) {
        setTimeout(() => void refreshRole(s.user.id).finally(() => setLoading(false)), 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        setSession(null);
        setRole(null);
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        await refreshRole(data.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role as AppRole);
    if (roles.includes("admin")) setRole("admin");
    else if (roles.includes("kitchen")) setRole("kitchen");
    else setRole(null);
  };

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    role,
    isAdmin: role === "admin",
    isKitchen: role === "kitchen",
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
