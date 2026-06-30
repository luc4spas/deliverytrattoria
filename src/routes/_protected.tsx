import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Tag, Settings, LogOut, ExternalLink, Users, Pizza, Moon, Sun, ChefHat, Megaphone } from "lucide-react";


export const Route = createFileRoute("/_protected")({
  component: ProtectedLayout,
});

type NavItem = { to: "/admin" | "/admin/pedidos" | "/admin/produtos" | "/admin/categorias" | "/admin/pizzas" | "/admin/clientes" | "/admin/configuracoes" | "/admin/equipe" | "/admin/marketing"; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/produtos", label: "Produtos", icon: UtensilsCrossed },
  { to: "/admin/pizzas", label: "Pizzas", icon: Pizza },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/marketing", label: "Marketing & Promoções", icon: Megaphone },
  { to: "/admin/equipe", label: "Equipe", icon: ChefHat },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function ProtectedLayout() {
  const { user, isAdmin, isKitchen, role, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // KDS: usuário de cozinha só pode ver /admin/pedidos
  useEffect(() => {
    if (!loading && isKitchen && path !== "/admin/pedidos") {
      navigate({ to: "/admin/pedidos", replace: true });
    }
  }, [loading, isKitchen, path, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  }
  if (!isAdmin && !isKitchen) {
    return (
      <div className="min-h-screen grid place-items-center p-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Sem permissão</h1>
          <p className="text-sm text-muted-foreground mt-2">Sua conta não tem acesso ao painel.</p>
          <Button variant="outline" className="mt-4" onClick={signOut}>Sair</Button>
        </div>
      </div>
    );
  }

  // Layout KDS em tela cheia (sem sidebar, sem nav lateral)
  if (isKitchen) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-sidebar text-sidebar-foreground border-b">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChefHat className="size-5" />
              <div>
                <div className="font-bold text-sm">Cozinha — KDS</div>
                <div className="text-[11px] opacity-70">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs hover:bg-sidebar-accent"
                title="Alternar tema"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-md bg-sidebar-accent px-3 py-1.5 text-xs"
              >
                <LogOut className="size-3.5" /> Sair
              </button>
            </div>
          </div>
        </header>
        <main className="p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="p-5 border-b">
          <div className="font-bold text-lg">Painel</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
            <ExternalLink className="size-4" /> Ver cardápio
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>

      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar border-b">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent"
                }`}
              >
                <n.icon className="size-3.5" />
                {n.label}
              </Link>
            );
          })}
          <button onClick={signOut} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-3 py-1.5 text-xs">
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
