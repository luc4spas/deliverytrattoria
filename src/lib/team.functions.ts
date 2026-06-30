import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./authz.server";

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at");
    if (error) throw error;

    const { data: usersData, error: uerr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (uerr) throw uerr;

    const usersById = new Map(usersData.users.map((u) => [u.id, u]));
    const seen = new Set<string>();
    const team: Array<{ user_id: string; email: string; role: string; created_at: string }> = [];
    for (const r of roles ?? []) {
      if (seen.has(r.user_id)) continue;
      seen.add(r.user_id);
      const u = usersById.get(r.user_id);
      team.push({
        user_id: r.user_id,
        email: u?.email ?? "(sem email)",
        role: r.role,
        created_at: r.created_at,
      });
    }
    return team;
  });

const createSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "kitchen"]),
});

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error) throw new Error(error.message);
    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("Falha ao criar usuário");

    const { error: rerr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (rerr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(rerr.message);
    }
    return { user_id: newUserId };
  });

const deleteSchema = z.object({ user_id: z.string().uuid() });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) {
      throw new Error("Você não pode remover sua própria conta");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
