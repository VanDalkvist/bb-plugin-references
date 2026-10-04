import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";

export interface QuickAddBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAdding: boolean;
}

export function QuickAddBar({ value, onChange, onSubmit, isAdding }: QuickAddBarProps) {
  return (
    <form onSubmit={onSubmit} className="relative flex items-center gap-1.5">
      <div className="relative flex-1">
        <Icon
          name="Plus"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste website link or image path + Enter to add..."
          disabled={isAdding}
          className="h-8 pl-8 pr-16 text-xs bg-background/90 border-border/80 focus-visible:border-primary shadow-inner"
        />
        {isAdding && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-primary animate-pulse font-medium">
            Fetching…
          </span>
        )}
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={!value.trim() || isAdding}
        className="h-8 px-2.5 text-xs font-semibold gap-1 shrink-0"
      >
        <Icon name="CornerDownLeft" className="size-3" />
        <span>Add</span>
      </Button>
    </form>
  );
}
