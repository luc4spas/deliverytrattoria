import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestOtp, verifyOtp } from "@/lib/customer-auth.functions";
import { onlyDigits } from "@/lib/format";
import { toast } from "sonner";

export function CustomerLoginDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: () => void;
}) {
  const reqOtp = useServerFn(requestOtp);
  const vOtp = useServerFn(verifyOtp);
  const qc = useQueryClient();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("phone");
    setPhone("");
    setName("");
    setCode("");
  };

  const send = async () => {
    if (phone.length < 10) return toast.error("Informe um WhatsApp válido");
    setBusy(true);
    try {
      await reqOtp({ data: { phone } });
      toast.success("Código enviado pelo WhatsApp");
      setStep("code");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar o código");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return toast.error("Código deve ter 6 dígitos");
    setBusy(true);
    try {
      await vOtp({ data: { phone, code, name: name || undefined } });
      toast.success("Pronto! Você está conectado.");
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Código inválido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {step === "phone" ? "Entrar com WhatsApp" : "Digite o código"}
          </DialogTitle>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-3">
            <div>
              <Label>Seu nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 13))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enviaremos um código de 6 dígitos pelo WhatsApp.
              </p>
            </div>
            <Button onClick={send} disabled={busy} className="w-full">
              {busy ? "Enviando..." : "Enviar código"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Código enviado para <strong>{phone}</strong>
            </p>
            <div>
              <Label>Código</Label>
              <Input
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value).slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>
            <Button onClick={verify} disabled={busy} className="w-full">
              {busy ? "Verificando..." : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              ← Trocar número
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
