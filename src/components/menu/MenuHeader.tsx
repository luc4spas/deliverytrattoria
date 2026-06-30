import { ShoppingBag, Clock, MapPin, User, LogOut, Receipt, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/hooks/use-cart";
import { useCustomer } from "@/hooks/use-customer";
import { useTheme } from "@/hooks/use-theme";
import { CustomerLoginDialog } from "./CustomerLoginDialog";
import type { RestaurantSettings } from "@/hooks/use-settings";

export function MenuHeader({ settings }: { settings: RestaurantSettings | null }) {
  const { count, setOpen } = useCart();
  const { customer, logout } = useCustomer();
  const { theme, toggle } = useTheme();
  const [loginOpen, setLoginOpen] = useState(false);
  const heroImage = (settings as any)?.hero_image_url as string | undefined;


  return (
    <header className="relative">
      <div className="relative bg-gradient-to-br from-primary to-primary/70 text-primary-foreground overflow-hidden">
        {heroImage && (
          <>
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/40" />
          </>
        )}
        <div className="relative mx-auto max-w-3xl px-4 pt-6 pb-24 sm:pt-10 sm:pb-28">
          <div className="flex justify-end items-center gap-2 mb-3">
            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
              className="inline-flex items-center justify-center size-8 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {customer ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-primary-foreground/25">
                    <User className="size-3.5" />
                    {customer.name || customer.phone}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {customer.phone}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/meus-pedidos" className="flex items-center gap-2">
                      <Receipt className="size-4" /> Meus pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void logout()}>
                    <LogOut className="size-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-primary-foreground/25"
              >
                <User className="size-3.5" /> Entrar com WhatsApp
              </button>
            )}
          </div>

          <div className="flex items-center gap-5">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.name}
                className="size-24 sm:size-28 rounded-2xl object-cover ring-4 ring-primary-foreground/30 shadow-xl"
              />
            ) : (
              <div className="size-24 sm:size-28 rounded-2xl bg-primary-foreground/15 grid place-items-center text-4xl font-bold ring-4 ring-primary-foreground/30 shadow-xl">
                {settings?.name?.[0] ?? "R"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {settings?.name ?? "Cardápio"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-90">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    settings?.is_open ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {settings?.is_open ? "Aberto agora" : "Fechado"}
                </span>
                {settings?.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" /> {settings.address}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> Entrega 30–60min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cart button */}
      <div className="sticky top-0 z-30 -mt-6 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border bg-card shadow-lg p-3 flex items-center gap-3">
            <input
              placeholder="Buscar no cardápio..."
              className="flex-1 bg-transparent outline-none px-2 text-sm"
              onChange={(e) => {
                const ev = new CustomEvent("menu-search", { detail: e.target.value });
                window.dispatchEvent(ev);
              }}
            />
            <Button onClick={() => setOpen(true)} size="sm" className="relative">
              <ShoppingBag className="size-4" />
              Carrinho
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background text-[10px] font-bold grid place-items-center">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <CustomerLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
