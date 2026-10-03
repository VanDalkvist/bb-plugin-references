import { useState, useCallback, memo } from "react";
import type { Reference } from "../types/schema.ts";
import { resolveImageUrl, isWebUrl } from "../utils/image-url.ts";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { cn } from "../../lib/utils.ts";

export interface ReferenceCardProps {
  reference: Reference;
  showProjectBadge?: boolean;
  onSelect: (reference: Reference) => void;
  onTagClick?: (tag: string) => void;
  onProjectClick?: (projectId: string) => void;
  onTogglePin?: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ReferenceCard = memo(function ReferenceCard({
  reference,
  showProjectBadge = false,
  onSelect,
  onTagClick,
  onProjectClick,
  onTogglePin,
  onRemove,
}: ReferenceCardProps) {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin?.(reference.id);
    },
    [onTogglePin, reference.id]
  );

  // Use previewUrl for website OG images, fallback to urlOrPath
  const targetImage = reference.previewUrl || reference.urlOrPath;
  const imgSrc = resolveImageUrl(targetImage);
  const isWeb = isWebUrl(reference.urlOrPath);
  const isWebsite = reference.kind === "website" || reference.kind === "github";

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(reference.urlOrPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [reference.urlOrPath]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDeleting) {
        onRemove(reference.id);
      } else {
        setIsDeleting(true);
        setTimeout(() => setIsDeleting(false), 3000);
      }
    },
    [isDeleting, onRemove, reference.id]
  );

  const handleCardClick = useCallback(() => {
    onSelect(reference);
  }, [onSelect, reference]);

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "cursor-pointer transition-all duration-150 ease-out hover:border-border/80 hover:shadow-md hover:bg-card/90"
      )}
    >
      {/* Image / Website Preview Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
        {!imgError && targetImage ? (
          <img
            src={imgSrc}
            alt={reference.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : isWebsite ? (
          /* Fallback for website without OG image: sleek stylized domain card */
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-card via-secondary/20 to-muted/50 text-foreground">
            {reference.faviconUrl ? (
              <img src={reference.faviconUrl} alt="" className="size-8 rounded-lg mb-1.5 shadow-sm" />
            ) : (
              <Icon name="Globe" className="size-8 text-primary/70 mb-1.5" />
            )}
            <span className="text-xs font-semibold line-clamp-1">{reference.title}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">{reference.domain || "Website"}</span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <Icon name="ImageOff" className="mb-2 size-8 opacity-40" />
            <span className="text-xs font-medium line-clamp-1">{reference.title}</span>
            <span className="text-[10px] opacity-70">Image unavailable</span>
          </div>
        )}

        {/* Pinned Badge (Камертон / На столе) */}
        {reference.pinned && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm backdrop-blur-sm">
            <Icon name="Pin" className="size-2.5 fill-current" />
            <span>Камертон</span>
          </div>
        )}

        {/* Project Badge (for All References view) */}
        {showProjectBadge && reference.projectId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProjectClick?.(reference.projectId);
            }}
            className={cn(
              "absolute z-10 flex items-center gap-1 rounded bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white/95 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-colors",
              reference.pinned ? "top-2 left-20" : "top-2 left-2"
            )}
            title={`Filter by project "${reference.projectName || reference.projectId}"`}
          >
            <Icon name="Folder" className="size-3" />
            <span>{reference.projectName || reference.projectId}</span>
          </button>
        )}

        {/* Domain & Favicon Pill for Websites */}
        {reference.domain && (
          <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
            {reference.faviconUrl ? (
              <img src={reference.faviconUrl} alt="" className="size-2.5 rounded-sm" />
            ) : (
              <Icon name="Globe" className="size-2.5 text-primary" />
            )}
            <span>{reference.domain}</span>
          </span>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 flex items-start justify-end gap-1.5 p-2 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {/* Toggle Pin / Камертон */}
          {onTogglePin && (
            <Button
              size="icon"
              variant={reference.pinned ? "default" : "secondary"}
              className={cn(
                "size-7 backdrop-blur-sm transition-colors",
                reference.pinned
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background"
              )}
              title={reference.pinned ? "Снять метку Камертона" : "Закрепить как Камертон (На столе)"}
              onClick={handleTogglePin}
            >
              <Icon name="Pin" className={cn("size-3.5", reference.pinned && "fill-current")} />
            </Button>
          )}

          {/* Copy URL / Path */}
          <Button
            size="icon"
            variant="secondary"
            className="size-7 bg-background/80 backdrop-blur-sm hover:bg-background text-foreground"
            title={copied ? "Copied!" : "Copy path / URL"}
            onClick={handleCopy}
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
              className="inline-flex size-7 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm text-foreground hover:bg-background hover:text-primary transition-colors"
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
              "size-7 backdrop-blur-sm",
              isDeleting
                ? "bg-destructive text-destructive-foreground"
                : "bg-background/80 text-muted-foreground hover:text-destructive hover:bg-background"
            )}
            title={isDeleting ? "Click again to confirm delete" : "Delete reference"}
            onClick={handleRemove}
          >
            <Icon name="Trash2" className="size-3.5" />
          </Button>
        </div>

        {/* Source Badge */}
        {reference.source && reference.source !== "manual" && (
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            {reference.source}
          </span>
        )}
      </div>

      {/* Card Info */}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-1.5">
          <h4 className="text-xs font-semibold leading-snug text-foreground line-clamp-1 group-hover:text-primary">
            {reference.title}
          </h4>
          {isWebsite && (
            <span className="shrink-0 text-muted-foreground/60 group-hover:text-primary">
              <Icon name="ExternalLink" className="size-3" />
            </span>
          )}
        </div>

        {reference.notes && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {reference.notes}
          </p>
        )}

        {/* Generation Prompt (if generated image) */}
        {reference.prompt && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-secondary/50 p-2 text-[10px] text-muted-foreground border border-border/50">
            <Icon name="Sparkles" className="size-3 text-primary shrink-0 mt-0.5" />
            <span className="flex-1 italic leading-relaxed select-text" title={reference.prompt}>
              {reference.prompt}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(reference.prompt!);
              }}
              className="text-muted-foreground hover:text-foreground shrink-0 ml-1 p-0.5 transition-colors"
              title="Copy generation prompt"
            >
              <Icon name="Copy" className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
