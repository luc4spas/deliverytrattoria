import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, logoutCustomer } from "@/lib/customer-auth.functions";

export function useCustomer() {
  const qc = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const doLogout = useServerFn(logoutCustomer);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 60_000,
  });

  return {
    customer: data?.customer ?? null,
    loading: isLoading,
    logout: async () => {
      await doLogout();
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
  };
}
