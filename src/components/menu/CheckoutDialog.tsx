import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/hooks/use-cart";
import { useCustomer } from "@/hooks/use-customer";
import { brl, onlyDigits } from "@/lib/format";
import { placeOrderAsCustomer } from "@/lib/customer-auth.functions";
import { validateCoupon } from "@/lib/promotions.functions";
import { calculateDeliveryFee } from "@/lib/delivery.functions";
import { useTodaysAutoPromotion } from "@/hooks/use-promotions";
import { useProducts } from "@/hooks/use-menu";
import {
  computeAutoDiscount,
  computeCouponDiscount,
  type CouponLike,
} from "@/lib/promotions-shared";
import type { RestaurantSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Loader2, BadgePercent, TicketPercent, X } from "lucide-react";
import { CustomerLoginDialog } from "./CustomerLoginDialog";

type OrderType = "delivery" | "pickup";
type Payment = "pix" | "money" | "card";

export function CheckoutDialog({
  settings,
  open,
  onOpenChange,
}: {
  settings: RestaurantSettings | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { items, subtotal, clear, setOpen: setCartOpen } = useCart();
  const { customer } = useCustomer();
  const placeOrder = useServerFn(placeOrderAsCustomer);
  const computeFee = useServerFn(calculateDeliveryFee);
  const checkCoupon = useServerFn(validateCoupon);
  const { todayPromo } = useTodaysAutoPromotion();
  const { data: products = [] } = useProducts();

  const [submitting, setSubmitting] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<OrderType>("delivery");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [payment, setPayment] = useState<Payment>("pix");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponLike | null>(null);

  // prefill from logged-in customer
  useEffect(() => {
    if (customer) {
      if (customer.name && !name) setName(customer.name);
      if (customer.phone && !phone) {
        const local = customer.phone.startsWith("55") ? customer.phone.slice(2) : customer.phone;
        setPhone(local);
      }
    }
  }, [customer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delivery fee ─────────────────────────────────────────────────────────
  const [autoFee, setAutoFee] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeDistance, setFeeDistance] = useState<number | null>(null);

  const storeAddress = settings?.address?.trim() ?? "";
  const customerAddress = [street, number, neighborhood, "Brasil"]
    .filter(Boolean)
    .join(", ")
    .trim();

  const addressReady =
    type === "delivery" &&
    !!storeAddress &&
    street.trim().length > 2 &&
    number.trim().length > 0 &&
    neighborhood.trim().length > 1;

  useEffect(() => {
    if (!addressReady) {
      setAutoFee(null);
      setFeeError(null);
      setFeeDistance(null);
      return;
    }
    let cancelled = false;
    setFeeLoading(true);
    setFeeError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await computeFee({
          data: { origin: storeAddress, destination: customerAddress },
        });
        if (cancelled) return;
        if (res.ok) {
          setAutoFee(res.customer_fee);
          setFeeDistance(res.distance_km);
        } else {
          setAutoFee(null);
          setFeeError(res.error);
        }
      } catch (e: any) {
        if (!cancelled) setFeeError(e?.message ?? "Erro ao calcular");
      } finally {
        if (!cancelled) setFeeLoading(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressReady, storeAddress, customerAddress]);

  const baseDeliveryFee =
    type === "delivery" ? autoFee ?? Number(settings?.delivery_fee ?? 0) : 0;

  // ── Discount estimates (server is authoritative) ────────────────────────
  const eligibleSubtotalForAuto = useMemo(() => {
    if (!todayPromo?.category_id) return subtotal;
    const productCategory = new Map(products.map((p) => [p.id, p.category_id]));
    return items.reduce((sum, it) => {
      const cat = productCategory.get(it.productId);
      return cat === todayPromo.category_id ? sum + it.price * it.quantity : sum;
    }, 0);
  }, [todayPromo, items, products, subtotal]);

  const autoDiscount = useMemo(
    () => (todayPromo ? computeAutoDiscount(todayPromo, subtotal, eligibleSubtotalForAuto) : 0),
    [todayPromo, subtotal, eligibleSubtotalForAuto],
  );

  const couponResult = useMemo(
    () =>
      appliedCoupon
        ? computeCouponDiscount(appliedCoupon, subtotal, baseDeliveryFee)
        : { discount: 0, freeShipping: false },
    [appliedCoupon, subtotal, baseDeliveryFee],
  );

  const itemsDiscount = Math.min(
    subtotal,
    autoDiscount + (couponResult.freeShipping ? 0 : couponResult.discount),
  );
  const deliveryFee = couponResult.freeShipping ? 0 : baseDeliveryFee;
  const totalDiscount =
    Math.round((itemsDiscount + (couponResult.freeShipping ? baseDeliveryFee : 0)) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - itemsDiscount + deliveryFee) * 100) / 100);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    try {
      const c = await checkCoupon({
        data: { code, subtotal, delivery_fee: baseDeliveryFee },
      });
      setAppliedCoupon(c);
      toast.success(`Cupom ${c.code} aplicado!`);
    } catch (e: any) {
      setAppliedCoupon(null);
      toast.error(e?.message ?? "Cupom inválido");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const buildWhatsApp = (orderId: string) => {
    const lines: string[] = [];
    lines.push(`*Novo pedido — ${settings?.name ?? ""}*`);
    lines.push(`Código: #${orderId.slice(0, 8).toUpperCase()}`);
    lines.push("");
    lines.push(`*Cliente:* ${name}`);
    lines.push(`*Telefone:* ${phone}`);
    lines.push(`*Tipo:* ${type === "delivery" ? "Entrega" : "Retirada no local"}`);
    if (type === "delivery") {
      lines.push(`*Endereço:* ${street}, ${number}${complement ? " — " + complement : ""}`);
      if (neighborhood) lines.push(`*Bairro:* ${neighborhood}`);
    }
    lines.push("");
    lines.push("*Itens:*");
    for (const it of items) {
      lines.push(`• ${it.quantity}x ${it.name} — ${brl(it.price * it.quantity)}`);
      if (it.meta?.kind === "pizza") {
        const frac = it.meta.flavors.length === 1 ? "" : it.meta.flavors.length === 2 ? "½ " : "⅓ ";
        const fl = it.meta.flavors.map((f) => `${frac}${f.name}`).join(" + ");
        lines.push(`  _${it.meta.sizeName} · ${fl}${it.meta.crust && it.meta.crust.price > 0 ? ` · borda ${it.meta.crust.name}` : ""}_`);
      }
      if (it.notes) lines.push(`  _Obs: ${it.notes}_`);
    }
    lines.push("");
    lines.push(`Subtotal: ${brl(subtotal)}`);
    if (totalDiscount > 0) lines.push(`Desconto: -${brl(totalDiscount)}${appliedCoupon ? ` (cupom ${appliedCoupon.code})` : todayPromo ? ` (${todayPromo.name})` : ""}`);
    if (deliveryFee) lines.push(`Entrega: ${brl(deliveryFee)}`);
    lines.push(`*Total: ${brl(total)}*`);
    lines.push("");
    const paymentLabel =
      payment === "pix" ? "PIX" : payment === "money" ? "Dinheiro" : "Cartão na entrega";
    lines.push(`*Pagamento:* ${paymentLabel}`);
    if (payment === "money" && changeFor) lines.push(`Troco para: ${brl(Number(changeFor))}`);
    if (notes) lines.push(`*Observações:* ${notes}`);
    return lines.join("\n");
  };

  const handleSubmit = async () => {
    if (!name.trim() || phone.length < 10) {
      toast.error("Preencha nome e telefone");
      return;
    }
    if (type === "delivery" && (!street || !number)) {
      toast.error("Informe o endereço de entrega");
      return;
    }
    setSubmitting(true);
    try {
      const address =
        type === "delivery" ? { street, number, neighborhood, complement } : null;

      const res = await placeOrder({
        data: {
          customer_name: name,
          customer_phone: phone,
          type,
          address,
          payment_method: payment,
          change_for: payment === "money" && changeFor ? Number(changeFor) : null,
          notes: notes || null,
          items: items.map((i) => ({
            product_id: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            notes: i.notes ?? null,
            meta: i.meta ?? null,
          })),
          subtotal,
          delivery_fee: baseDeliveryFee,
          total,
          coupon_code: appliedCoupon?.code ?? null,
        },
      });

      const msg = encodeURIComponent(buildWhatsApp(res.id));
      const wa = onlyDigits(settings?.whatsapp ?? "");
      const url = `https://wa.me/${wa}?text=${msg}`;
      window.open(url, "_blank");
      toast.success("Pedido enviado! Continue no WhatsApp.");
      clear();
      onOpenChange(false);
      setCartOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Não foi possível enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar pedido</DialogTitle>
        </DialogHeader>

        {!customer && (
          <div className="rounded-lg border bg-primary/5 p-3 text-sm flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              Entre com seu WhatsApp para acompanhar seus pedidos.
            </span>
            <Button size="sm" variant="outline" onClick={() => setLoginOpen(true)}>
              Entrar
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="col-span-2">
              <Label>WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 13))}
                inputMode="tel"
                placeholder="(11) 99999-9999"
                disabled={!!customer}
              />
            </div>
          </div>

          <div>
            <Label>Como deseja receber?</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as OrderType)}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="delivery" /> Entrega
              </label>
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="pickup" /> Retirada
              </label>
            </RadioGroup>
          </div>

          {type === "delivery" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Rua</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} maxLength={120} />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} maxLength={10} />
              </div>
              <div className="col-span-2">
                <Label>Bairro</Label>
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} />
              </div>
              <div>
                <Label>Compl.</Label>
                <Input value={complement} onChange={(e) => setComplement(e.target.value)} maxLength={40} />
              </div>
            </div>
          )}

          <div>
            <Label>Forma de pagamento</Label>
            <RadioGroup
              value={payment}
              onValueChange={(v) => setPayment(v as Payment)}
              className="mt-2 space-y-2"
            >
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="pix" /> PIX {settings?.pix_key && <span className="text-xs text-muted-foreground">— {settings.pix_key}</span>}
              </label>
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="money" /> Dinheiro
              </label>
              <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="card" /> Cartão na entrega
              </label>
            </RadioGroup>
            {payment === "money" && (
              <div className="mt-2">
                <Label>Troco para</Label>
                <Input
                  value={changeFor}
                  onChange={(e) => setChangeFor(onlyDigits(e.target.value))}
                  placeholder="Opcional"
                  inputMode="numeric"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Algo que devemos saber?"
            />
          </div>

          {/* Coupon */}
          <div>
            <Label className="flex items-center gap-1.5">
              <TicketPercent className="size-4" /> Cupom de desconto
            </Label>
            {appliedCoupon ? (
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
                <div className="text-sm">
                  <span className="font-semibold text-primary">{appliedCoupon.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {appliedCoupon.discount_type === "percent"
                      ? `${appliedCoupon.discount_value}% off`
                      : appliedCoupon.discount_type === "free_shipping"
                      ? "Frete grátis"
                      : `-${brl(appliedCoupon.discount_value)}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remover cupom"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase().slice(0, 40))}
                  placeholder="DIGITE O CÓDIGO"
                  className="uppercase tracking-wider"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !couponInput.trim()}
                >
                  {applyingCoupon ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
            )}
          </div>

          {/* Today's automatic promotion */}
          {todayPromo && autoDiscount > 0 && (
            <div className="rounded-lg border border-success/30 bg-success/10 p-3 flex items-start gap-2 text-sm">
              <BadgePercent className="size-4 text-success-foreground mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">{todayPromo.name}</div>
                <div className="text-xs text-muted-foreground">
                  Desconto automático aplicado: <span className="font-semibold text-success-foreground">-{brl(autoDiscount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-success-foreground">
                <span className="inline-flex items-center gap-1">
                  <BadgePercent className="size-3.5" /> Desconto
                </span>
                <span className="font-semibold">-{brl(totalDiscount)}</span>
              </div>
            )}
            {type === "delivery" && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  Entrega
                  {feeLoading && <Loader2 className="size-3 animate-spin" />}
                  {feeDistance != null && !feeLoading && (
                    <span className="text-xs">({feeDistance.toFixed(1)} km)</span>
                  )}
                </span>
                <span>
                  {feeLoading
                    ? "calculando..."
                    : feeError
                    ? <span className="text-xs text-destructive">{feeError}</span>
                    : couponResult.freeShipping ? (
                        <span><span className="line-through text-muted-foreground mr-1">{brl(baseDeliveryFee)}</span>Grátis</span>
                      ) : brl(deliveryFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1 border-t mt-1"><span>Total</span><span className="text-primary">{brl(total)}</span></div>
            {totalDiscount > 0 && (
              <p className="text-xs text-success-foreground text-right">
                Você economizou {brl(totalDiscount)} 🎉
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full">
            {submitting ? "Enviando..." : "Enviar pedido pelo WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CustomerLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
