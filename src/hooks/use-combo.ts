import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ComboStep = Database["public"]["Tables"]["combo_steps"]["Row"];
export type ComboStepItem = Database["public"]["Tables"]["combo_step_items"]["Row"];

export type ComboStructure = {
  steps: (ComboStep & { items: ComboStepItem[] })[];
};

export function useComboStructure(productId: string | null | undefined) {
  return useQuery({
    enabled: !!productId,
    queryKey: ["combo_structure", productId],
    queryFn: async (): Promise<ComboStructure> => {
      const { data: steps, error: e1 } = await supabase
        .from("combo_steps")
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order");
      if (e1) throw e1;
      const stepIds = (steps ?? []).map((s) => s.id);
      let items: ComboStepItem[] = [];
      if (stepIds.length) {
        const { data, error: e2 } = await supabase
          .from("combo_step_items")
          .select("*")
          .in("step_id", stepIds);
        if (e2) throw e2;
        items = data ?? [];
      }
      return {
        steps: (steps ?? []).map((s) => ({
          ...s,
          items: items.filter((i) => i.step_id === s.id),
        })),
      };
    },
  });
}

export function useAllComboSteps() {
  return useQuery({
    queryKey: ["combo_steps_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("combo_steps")
        .select("*, items:combo_step_items(*)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}
