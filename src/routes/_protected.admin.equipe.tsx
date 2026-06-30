import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listTeam, createTeamMember, deleteTeamMember } from "@/lib/team.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ShieldCheck, ChefHat } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_protected/admin/equipe")({
  component: TeamPage,
});

function TeamPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchTeam = useServerFn(listTeam);
  const createFn = useServerFn(createTeamMember);
  const removeFn = useServerFn(deleteTeamMember);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/admin" });
  }, [loading, isAdmin, navigate]);

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchTeam(),
    enabled: isAdmin,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "kitchen" as "admin" | "kitchen" });

  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      toast.success("Usuário cadastrado");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "kitchen" });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao cadastrar"),
  });

  const remove = useMutation({
    mutationFn: (user_id: string) => removeFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Equipe</h1>
          <p className="text-sm text-muted-foreground">Cadastre administradores e operadores da cozinha (KDS).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-1.5" /> Novo usuário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar membro da equipe</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
              className="space-y-3"
            >
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div>
                <Label>Nível de acesso</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="kitchen">Cozinha (KDS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="divide-y">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando...</div>}
        {!isLoading && team.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">Nenhum usuário cadastrado.</div>
        )}
        {team.map((m) => (
          <div key={m.user_id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-medium truncate">{m.email}</div>
              <div className="text-xs text-muted-foreground">
                Desde {new Date(m.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.role === "admin" ? (
                <Badge variant="default" className="gap-1"><ShieldCheck className="size-3" /> Administrador</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><ChefHat className="size-3" /> Cozinha</Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Remover ${m.email}?`)) remove.mutate(m.user_id);
                }}
                title="Remover"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
