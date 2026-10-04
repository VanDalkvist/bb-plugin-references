import { Icon } from "../../components/ui/icon.tsx";
import { cn } from "../../lib/utils.ts";
import type { ReferenceKind } from "../types/schema.ts";

export interface FilterToggleGroupProps {
  kindFilter: "all" | ReferenceKind;
  onSetKindFilter: (kind: "all" | ReferenceKind) => void;
  pinnedOnly: boolean;
  onSetPinnedOnly: (pinned: boolean) => void;
  pinnedCount: number;
}

export function FilterToggleGroup({
  kindFilter,
  onSetKindFilter,
  pinnedOnly,
  onSetPinnedOnly,
  pinnedCount,
}: FilterToggleGroupProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {/* Working Set ("Камертон" / "На столе") */}
      <div className="flex items-center rounded-lg border border-border bg-background/80 p-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onSetPinnedOnly(false)}
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
            !pinnedOnly
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Все
        </button>
        <button
          type="button"
          onClick={() => onSetPinnedOnly(true)}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
            pinnedOnly
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Фокус на стилеобразующих диорамах ('На столе')"
        >
          <Icon name="Pin" className={cn("size-2.5", pinnedOnly && "fill-current")} />
          <span>Камертон</span>
          {pinnedCount > 0 && (
            <span
              className={cn(
                "ml-0.5 rounded-full px-1 text-[9px]",
                pinnedOnly
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {pinnedCount}
            </span>
          )}
        </button>
      </div>

      {/* Kind Filter */}
      <div className="flex items-center rounded-lg border border-border bg-background/80 p-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onSetKindFilter("all")}
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
            kindFilter === "all"
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onSetKindFilter("image")}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
            kindFilter === "image"
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon name="Image" className="size-2.5" />
          <span>Images</span>
        </button>
        <button
          type="button"
          onClick={() => onSetKindFilter("website")}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
            kindFilter === "website"
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon name="Globe" className="size-2.5" />
          <span>Websites</span>
        </button>
      </div>
    </div>
  );
}
