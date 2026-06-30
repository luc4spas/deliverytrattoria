import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RestaurantSettings = Database["public"]["Tables"]["restaurant_settings"]["Row"];

export function useSettings() {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<RestaurantSettings | null> => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Apply primary color as CSS var
  useEffect(() => {
    const color = query.data?.primary_color;
    if (!color || typeof document === "undefined") return;
    // Convert hex -> oklch via a quick fallback: just set as raw hex on a CSS var
    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--ring", color);
    document.documentElement.style.setProperty("--sidebar-primary", color);
  }, [query.data?.primary_color]);

  return query;
}
