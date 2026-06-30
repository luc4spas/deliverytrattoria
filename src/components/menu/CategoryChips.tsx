import { Pizza, IceCream2, Sparkles, Utensils } from "lucide-react";
import type { Category } from "@/hooks/use-menu";

export function CategoryChips({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (id: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
      <ul className="flex gap-4 py-3 min-w-max">
        {categories.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              className="flex flex-col items-center gap-1.5 w-16 group"
            >
              <div className="size-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition bg-muted grid place-items-center shadow-sm">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <CategoryFallbackIcon kind={c.kind} />
                )}
              </div>
              <span className="text-[11px] leading-tight text-center line-clamp-2 font-medium">
                {c.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryFallbackIcon({ kind }: { kind: Category["kind"] }) {
  if (kind === ("combo" as any))
    return <Sparkles className="size-6 text-muted-foreground" />;
  if (kind === ("pizza_doce" as any))
    return <IceCream2 className="size-6 text-muted-foreground" />;
  if (kind === "pizza")
    return <Pizza className="size-6 text-muted-foreground" />;
  return <Utensils className="size-6 text-muted-foreground" />;
}
