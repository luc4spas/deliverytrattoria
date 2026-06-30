import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PizzaSize = Database["public"]["Tables"]["pizza_sizes"]["Row"];
export type PizzaCrust = Database["public"]["Tables"]["pizza_crusts"]["Row"];
export type PizzaFlavorPrice = Database["public"]["Tables"]["pizza_flavor_prices"]["Row"];

export function usePizzaSizes(onlyActive = false) {
  return useQuery({
    queryKey: ["pizza_sizes", onlyActive],
    queryFn: async (): Promise<PizzaSize[]> => {
      let q = supabase.from("pizza_sizes").select("*").order("sort_order");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePizzaCrusts(onlyActive = false) {
  return useQuery({
    queryKey: ["pizza_crusts", onlyActive],
    queryFn: async (): Promise<PizzaCrust[]> => {
      let q = supabase.from("pizza_crusts").select("*").order("sort_order");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePizzaFlavorPrices() {
  return useQuery({
    queryKey: ["pizza_flavor_prices"],
    queryFn: async (): Promise<PizzaFlavorPrice[]> => {
      const { data, error } = await supabase.from("pizza_flavor_prices").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}
