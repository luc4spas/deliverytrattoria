import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSettings, type RestaurantSettings } from "@/hooks/use-settings";
import { onlyDigits } from "@/lib/format";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { OpeningHoursEditor, DEFAULT_HOURS, normalizeHours, type OpeningHours } from "@/components/admin/OpeningHoursEditor";

export const Route = createFileRoute("/_protected/admin/configuracoes")({
  component: SettingsPage,
});

type WhatsappIntegration = {
  id: string;
  base_url: string | null;
  api_key: string | null;
  instance: string | null;
  is_enabled: boolean;
};

function SettingsPage() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...data, opening_hours: normalizeHours(data.opening_hours) as any });
  }, [data]);


  const save = useMutation({
    mutationFn: async () => {
      if (!data?.id) return;
      const { error } = await supabase
        .from("restaurant_settings")
        .update({
          logo_url: form.logo_url,
          hero_image_url: (form as any).hero_image_url ?? null,
          primary_color: form.primary_color,
          whatsapp: onlyDigits(form.whatsapp ?? ""),
          address: form.address,
          delivery_fee: Number(form.delivery_fee) || 0,
          min_order: Number(form.min_order) || 0,
          is_open: !!form.is_open,
          pix_key: form.pix_key,
          opening_hours: (form.opening_hours as any) ?? DEFAULT_HOURS,
          cashier_printer_name: (form as any).cashier_printer_name || null,
          kitchen_printer_name: (form as any).kitchen_printer_name || null,
          auto_print_enabled: !!(form as any).auto_print_enabled,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("menu-images").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("menu-images").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: pub.publicUrl }));
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const uploadHero = async (file: File) => {
    setUploadingHero(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `hero/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("menu-images").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("menu-images").getPublicUrl(path);
      setForm((f) => ({ ...f, hero_image_url: pub.publicUrl } as any));
    } catch (e: any) { toast.error(e.message); } finally { setUploadingHero(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Identidade, contato e regras do restaurante.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div>
            <div className="font-medium">Restaurante aberto</div>
            <div className="text-xs text-muted-foreground">Quando fechado, o checkout fica bloqueado.</div>
          </div>
          <Switch checked={!!form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} />
        </div>

        <div>
          <Label>Nome</Label>
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
        </div>

        <div>
          <Label>Logo</Label>
          <div className="mt-1 flex items-center gap-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt="" className="size-16 rounded-lg object-cover" />
            ) : (
              <div className="size-16 rounded-lg bg-muted grid place-items-center text-muted-foreground">Logo</div>
            )}
            <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
            {form.logo_url && <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, logo_url: null })}>Remover</Button>}
          </div>
        </div>

        <div>
          <Label>Imagem de fundo (capa do cardápio)</Label>
          <p className="text-xs text-muted-foreground mb-2">Aparece atrás do nome do restaurante. Use uma foto horizontal de boa qualidade.</p>
          <div className="mt-1 flex items-center gap-3">
            {(form as any).hero_image_url ? (
              <img src={(form as any).hero_image_url} alt="" className="h-16 w-28 rounded-lg object-cover" />
            ) : (
              <div className="h-16 w-28 rounded-lg bg-muted grid place-items-center text-xs text-muted-foreground">Capa</div>
            )}
            <Input type="file" accept="image/*" disabled={uploadingHero} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); }} />
            {(form as any).hero_image_url && <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, hero_image_url: null } as any)}>Remover</Button>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cor primária</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={form.primary_color ?? "#dc2626"}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="size-10 rounded-md border cursor-pointer"
              />
              <Input value={form.primary_color ?? ""} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>WhatsApp (com DDI+DDD)</Label>
            <Input
              value={form.whatsapp ?? ""}
              onChange={(e) => setForm({ ...form, whatsapp: onlyDigits(e.target.value).slice(0, 13) })}
              placeholder="5511999999999"
            />
          </div>
        </div>

        <div>
          <Label>Endereço</Label>
          <Textarea value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} maxLength={200} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Taxa de entrega (R$)</Label>
            <Input
              inputMode="decimal"
              value={String(form.delivery_fee ?? 0)}
              onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value.replace(",", ".")) || 0 })}
            />
          </div>
          <div>
            <Label>Pedido mínimo (R$)</Label>
            <Input
              inputMode="decimal"
              value={String(form.min_order ?? 0)}
              onChange={(e) => setForm({ ...form, min_order: Number(e.target.value.replace(",", ".")) || 0 })}
            />
          </div>
        </div>

        <div>
          <Label>Chave PIX</Label>
          <Input value={form.pix_key ?? ""} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} maxLength={120} />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg" className="w-full">
          {save.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Dias e horários de funcionamento</h2>
          <p className="text-sm text-muted-foreground">
            Configure quando o restaurante aceita pedidos. Pode adicionar múltiplos intervalos por dia (almoço e jantar, por exemplo).
          </p>
        </div>
        <OpeningHoursEditor
          value={normalizeHours(form.opening_hours)}
          onChange={(v: OpeningHours) => setForm({ ...form, opening_hours: v as any })}
        />
        <Button onClick={() => save.mutate()} disabled={save.isPending} variant="outline" className="w-full">
          {save.isPending ? "Salvando..." : "Salvar horários"}
        </Button>
      </Card>




      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Impressão automática (QZ Tray)</h2>
          <p className="text-sm text-muted-foreground">
            Imprime duas vias (Caixa e Cozinha) ao aceitar o pedido. Requer o programa{" "}
            <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="underline">QZ Tray</a> instalado e aberto no computador do caixa.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div>
            <div className="font-medium">Imprimir automaticamente ao aceitar</div>
            <div className="text-xs text-muted-foreground">Quando ligado, as duas vias são enviadas direto às impressoras.</div>
          </div>
          <Switch
            checked={!!(form as any).auto_print_enabled}
            onCheckedChange={(v) => setForm({ ...form, auto_print_enabled: v } as any)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Impressora do Caixa</Label>
            <Input
              value={(form as any).cashier_printer_name ?? ""}
              onChange={(e) => setForm({ ...form, cashier_printer_name: e.target.value } as any)}
              placeholder="Ex: Impressora_Caixa"
            />
          </div>
          <div>
            <Label>Impressora da Cozinha</Label>
            <Input
              value={(form as any).kitchen_printer_name ?? ""}
              onChange={(e) => setForm({ ...form, kitchen_printer_name: e.target.value } as any)}
              placeholder="Ex: Impressora_Cozinha"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Use exatamente o nome como aparece no Windows / macOS. Bobina recomendada: 80mm.
        </p>

        <Button onClick={() => save.mutate()} disabled={save.isPending} variant="outline" className="w-full">
          {save.isPending ? "Salvando..." : "Salvar impressão"}
        </Button>
      </Card>

      <WhatsappIntegrationCard />
    </div>
  );
}

function WhatsappIntegrationCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<WhatsappIntegration>>({});
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const { data } = useQuery({
    queryKey: ["whatsapp_integration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_integration")
        .select("id, base_url, api_key, instance, is_enabled")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsappIntegration | null;
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data?.id) throw new Error("Registro não encontrado");
      const { error } = await supabase
        .from("whatsapp_integration")
        .update({
          base_url: form.base_url?.trim() || null,
          api_key: form.api_key?.trim() || null,
          instance: form.instance?.trim() || null,
          is_enabled: !!form.is_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integração WhatsApp salva");
      qc.invalidateQueries({ queryKey: ["whatsapp_integration"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendTest = async () => {
    const phone = onlyDigits(testPhone);
    if (phone.length < 10) { toast.error("Informe um telefone válido"); return; }
    setTesting(true);
    try {
      const { requestOtp } = await import("@/lib/customer-auth.functions");
      await requestOtp({ data: { phone } });
      toast.success("Código de teste enviado pelo WhatsApp");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Integração WhatsApp (Evolution API)</h2>
        <p className="text-sm text-muted-foreground">
          Credenciais usadas para enviar códigos de login via WhatsApp aos clientes.
          Cada restaurante pode ter sua própria instância.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
        <div>
          <div className="font-medium">Integração ativa</div>
          <div className="text-xs text-muted-foreground">Quando desligada, o login por WhatsApp fica indisponível.</div>
        </div>
        <Switch checked={!!form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
      </div>

      <div>
        <Label>URL base da Evolution API</Label>
        <Input
          value={form.base_url ?? ""}
          onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          placeholder="https://evolution.seudominio.com"
        />
      </div>

      <div>
        <Label>Nome da instância</Label>
        <Input
          value={form.instance ?? ""}
          onChange={(e) => setForm({ ...form, instance: e.target.value })}
          placeholder="meu-restaurante"
        />
      </div>

      <div>
        <Label>API Key</Label>
        <div className="flex gap-2">
          <Input
            type={showKey ? "text" : "password"}
            value={form.api_key ?? ""}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            placeholder="••••••••"
            autoComplete="off"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((v) => !v)}>
            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Armazenada com acesso restrito a administradores. Nunca exposta ao site público.
        </p>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
        {save.isPending ? "Salvando..." : "Salvar integração"}
      </Button>

      <div className="border-t pt-4 space-y-2">
        <Label>Enviar código de teste</Label>
        <div className="flex gap-2">
          <Input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="11999999999"
          />
          <Button type="button" variant="outline" onClick={sendTest} disabled={testing}>
            {testing ? "Enviando..." : "Enviar teste"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Envia um código real para o número informado, validando a configuração.
        </p>
      </div>
    </Card>
  );
}
