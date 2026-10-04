import { cn } from "../../lib/utils.ts";
import type { TagInfo } from "../types/schema.ts";

export interface TagFilterBarProps {
  tags: TagInfo[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function TagFilterBar({ tags, selectedTag, onSelectTag }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
      <button
        type="button"
        onClick={() => onSelectTag(null)}
        className={cn(
          "rounded-full px-2.5 py-0.5 font-medium transition-colors shrink-0",
          selectedTag === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
        )}
      >
        All tags
      </button>
      {tags.map((tag) => (
        <button
          key={tag.name}
          type="button"
          onClick={() => onSelectTag(selectedTag === tag.name ? null : tag.name)}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition-colors shrink-0",
            selectedTag === tag.name
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
          )}
        >
          <span>#{tag.name}</span>
          <span className="opacity-60 text-[9px]">({tag.count})</span>
        </button>
      ))}
    </div>
  );
}
