import { Link, useRouterState } from "@tanstack/react-router";
import { Utensils, Search, ShoppingBag, Ticket, User } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

type Tab = {
  to: string;
  label: string;
  Icon: typeof Utensils;
  match?: (path: string) => boolean;
  onClick?: (e: React.MouseEvent) => void;
  badge?: number;
};

export function BottomNav() {
  const { count, setOpen } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const focusSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector<HTMLInputElement>('input[placeholder^="Buscar"]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el.focus(), 250);
    }
  };

  const openCart = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  };

  const tabs: Tab[] = [
    { to: "/", label: "Cardápio", Icon: Utensils, match: (p) => p === "/" },
    { to: "/", label: "Buscar", Icon: Search, onClick: focusSearch },
    { to: "/", label: "Sacola", Icon: ShoppingBag, onClick: openCart, badge: count },
    { to: "/cupons", label: "Cupons", Icon: Ticket, match: (p) => p.startsWith("/cupons") },
    { to: "/meus-pedidos", label: "Perfil", Icon: User, match: (p) => p.startsWith("/meus-pedidos") },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex justify-around items-center h-16">
        {tabs.map((t, i) => {
          const active = t.match ? t.match(pathname) : false;
          const Icon = t.Icon;
          return (
            <li key={i} className="flex-1">
              <Link
                to={t.to}
                onClick={t.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-16 relative",
                  active ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="size-5" />
                  {t.badge && t.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
                      {t.badge}
                    </span>
                  ) : null}
                </div>
                <span className={cn("text-[10px] leading-none", active && "font-bold")}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
