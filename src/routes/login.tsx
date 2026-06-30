import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { claimAdminIfFirst } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Painel" }] }),
});

function LoginPage() {
  const { signIn, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const claim = useServerFn(claimAdminIfFirst);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      claim()
        .catch(() => {})
        .finally(() => {
          if (role === "kitchen") navigate({ to: "/admin/pedidos" });
          else navigate({ to: "/admin" });
        });
    }
  }, [user, role, loading, navigate, claim]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      await claim().catch(() => {});
      // Redirect handled by useEffect once role loads
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar ao cardápio</Link>
          <h1 className="text-2xl font-bold mt-2">Entrar no painel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesso restrito à equipe autorizada.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-center text-muted-foreground">
          Esqueceu sua senha? Solicite ao administrador.
        </p>
      </Card>
    </div>
  );
}
