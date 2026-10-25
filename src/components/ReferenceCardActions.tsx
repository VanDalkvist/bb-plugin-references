import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { cn } from "../../lib/utils.ts";
import type { Reference } from "../types/schema.ts";

export interface ReferenceCardActionsProps {
  reference: Reference;
  isWeb: boolean;
  copied: boolean;
  isDeleting: boolean;
  onTogglePin?: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

export function ReferenceCardActions({
  reference,
  isWeb,
  copied,
  isDeleting,
  onTogglePin,
  onCopy,
  onRemove,
}: ReferenceCardActionsProps) {
  return (
    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-20">
      {/* Toggle Pin / Anchor */}
      {onTogglePin && (
        <Button
          size="icon"
          variant={reference.pinned ? "default" : "secondary"}
          className={cn(
            "size-7 shadow-xs border transition-colors",
            reference.pinned
              ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
              : "bg-background/95 text-muted-foreground hover:text-foreground hover:bg-background border-border/80"
          )}
          title={reference.pinned ? "Unpin anchor" : "Pin as aesthetic anchor"}
          onClick={onTogglePin}
        >
          <Icon name="Pin" className={cn("size-3.5", reference.pinned && "fill-current")} />
        </Button>
      )}

      {/* Copy URL / Path */}
      <Button
        size="icon"
        variant="secondary"
        className="size-7 bg-background/95 hover:bg-background text-foreground shadow-xs border border-border/80"
        title={copied ? "Copied!" : "Copy path / URL"}
        onClick={onCopy}
      >
        <Icon name={copied ? "Check" : "Copy"} className="size-3.5" />
      </Button>

      {/* Open external web URL */}
      {isWeb && (
        <a
          href={reference.urlOrPath}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex size-7 items-center justify-center rounded-md bg-background/95 text-foreground hover:bg-background hover:text-primary transition-colors shadow-xs border border-border/80"
          title="Open site in new tab"
        >
          <Icon name="ExternalLink" className="size-3.5" />
        </a>
      )}

      {/* Delete reference */}
      <Button
        size="icon"
        variant={isDeleting ? "destructive" : "secondary"}
        className={cn(
          "size-7 shadow-xs border transition-colors",
          isDeleting
            ? "bg-destructive text-destructive-foreground border-transparent"
            : "bg-background/95 text-muted-foreground hover:text-destructive hover:bg-background border-border/80"
        )}
        title={isDeleting ? "Click again to confirm delete" : "Delete reference"}
        onClick={onRemove}
      >
        <Icon name="Trash2" className="size-3.5" />
      </Button>
    </div>
  );
}
