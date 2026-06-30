import { Clock, Utensils } from "lucide-react";
import type { Category } from "@/hooks/use-menu";

export function CategoryHeroCard({
  category,
  itemCount,
  onClick,
}: {
  category: Category;
  itemCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
    >
      {category.image_url ? (
        <img
          src={category.image_url}
          alt={category.name}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary grid place-items-center">
          <Utensils className="size-12 text-primary-foreground/60" />
        </div>
      )}

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 text-left">
        <h3 className="text-white font-bold text-xl sm:text-2xl drop-shadow-sm leading-tight">
          {category.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-white/90 text-xs sm:text-sm font-medium">
          {category.prep_time_minutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {category.prep_time_minutes} min
            </span>
          ) : null}
          {typeof itemCount === "number" && itemCount > 0 ? (
            <span className="opacity-90">
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
