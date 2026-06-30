export type StaffRole = "admin" | "kitchen";

export async function getStaffRole(supabase: any, userId: string): Promise<StaffRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  const roles = (data ?? []).map((row: { role: StaffRole }) => row.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("kitchen")) return "kitchen";
  return null;
}

export async function assertAdmin(supabase: any, userId: string) {
  const role = await getStaffRole(supabase, userId);
  if (role !== "admin") throw new Error("Acesso restrito a administradores");
}

export async function assertStaff(supabase: any, userId: string) {
  const role = await getStaffRole(supabase, userId);
  if (!role) throw new Error("Acesso restrito à equipe autorizada");
  return role;
}