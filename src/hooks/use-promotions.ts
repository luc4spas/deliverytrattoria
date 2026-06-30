import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAutoPromotionActiveNow, type AutoPromotionLike } from "@/lib/promotions-shared";

export type AutoPromotion = AutoPromotionLike & {
  description: string | null;
  is_active: boolean;
};

export function useAutoPromotions() {
  return useQuery({
    queryKey: ["automatic_promotions", "active"],
    queryFn: async (): Promise<AutoPromotion[]> => {
      const { data, error } = await supabase
        .from("automatic_promotions")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as unknown as AutoPromotion[];
    },
    staleTime: 60_000,
  });
}

export function useTodaysAutoPromotion() {
  const q = useAutoPromotions();
  const todayPromo = useMemo(() => {
    const list = q.data ?? [];
    const now = new Date();
    return list.find((p) => isAutoPromotionActiveNow(p, now)) ?? null;
  }, [q.data]);
  return { ...q, todayPromo };
}
