import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export type TimeRange = { start: string; end: string };
export type DaySchedule = { enabled: boolean; ranges: TimeRange[] };
export type OpeningHours = Record<DayKey, DaySchedule>;

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Segunda-feira" },
  { key: "tue", label: "Terça-feira" },
  { key: "wed", label: "Quarta-feira" },
  { key: "thu", label: "Quinta-feira" },
  { key: "fri", label: "Sexta-feira" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export const DEFAULT_HOURS: OpeningHours = {
  mon: { enabled: true, ranges: [{ start: "18:00", end: "23:00" }] },
  tue: { enabled: true, ranges: [{ start: "18:00", end: "23:00" }] },
  wed: { enabled: true, ranges: [{ start: "18:00", end: "23:00" }] },
  thu: { enabled: true, ranges: [{ start: "18:00", end: "23:00" }] },
  fri: { enabled: true, ranges: [{ start: "18:00", end: "23:30" }] },
  sat: { enabled: true, ranges: [{ start: "18:00", end: "23:30" }] },
  sun: { enabled: false, ranges: [{ start: "18:00", end: "23:00" }] },
};

export function normalizeHours(value: unknown): OpeningHours {
  const out = { ...DEFAULT_HOURS };
  if (value && typeof value === "object") {
    for (const d of DAYS) {
      const v = (value as any)[d.key];
      if (v && typeof v === "object") {
        out[d.key] = {
          enabled: !!v.enabled,
          ranges: Array.isArray(v.ranges) && v.ranges.length > 0
            ? v.ranges.map((r: any) => ({ start: String(r?.start ?? "18:00"), end: String(r?.end ?? "23:00") }))
            : [{ start: "18:00", end: "23:00" }],
        };
      }
    }
  }
  return out;
}

export function isOpenNow(hours: OpeningHours, now = new Date()): boolean {
  const keys: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = hours[keys[now.getDay()]];
  if (!today?.enabled) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return today.ranges.some((r) => {
    const [sh, sm] = r.start.split(":").map(Number);
    const [eh, em] = r.end.split(":").map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    return m >= s && m <= e;
  });
}

interface Props {
  value: OpeningHours;
  onChange: (v: OpeningHours) => void;
}

export function OpeningHoursEditor({ value, onChange }: Props) {
  const update = (day: DayKey, patch: Partial<DaySchedule>) => {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  };
  const updateRange = (day: DayKey, idx: number, patch: Partial<TimeRange>) => {
    const ranges = value[day].ranges.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    update(day, { ranges });
  };
  const addRange = (day: DayKey) => {
    update(day, { ranges: [...value[day].ranges, { start: "11:00", end: "14:00" }] });
  };
  const removeRange = (day: DayKey, idx: number) => {
    const ranges = value[day].ranges.filter((_, i) => i !== idx);
    update(day, { ranges: ranges.length ? ranges : [{ start: "18:00", end: "23:00" }] });
  };
  const copyToAll = (day: DayKey) => {
    const src = value[day];
    const next = { ...value };
    for (const d of DAYS) {
      next[d.key] = { enabled: src.enabled, ranges: src.ranges.map((r) => ({ ...r })) };
    }
    onChange(next);
    toast.success("Horários replicados para todos os dias");
  };

  return (
    <div className="space-y-2">
      {DAYS.map((d) => {
        const day = value[d.key];
        return (
          <div key={d.key} className="rounded-lg border p-3 bg-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Switch checked={day.enabled} onCheckedChange={(v) => update(d.key, { enabled: v })} />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{d.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {day.enabled ? day.ranges.map((r) => `${r.start} – ${r.end}`).join(", ") : "Fechado"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToAll(d.key)}
                title="Copiar para todos os dias"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Copy className="size-3.5" /> Replicar
              </button>
            </div>

            {day.enabled && (
              <div className="mt-3 space-y-2">
                {day.ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={r.start}
                      onChange={(e) => updateRange(d.key, i, { start: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="time"
                      value={r.end}
                      onChange={(e) => updateRange(d.key, i, { end: e.target.value })}
                      className="w-32"
                    />
                    {day.ranges.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRange(d.key, i)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addRange(d.key)}
                  className="text-xs"
                >
                  <Plus className="size-3.5 mr-1" /> Adicionar intervalo
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
