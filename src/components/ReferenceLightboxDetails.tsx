import { useState, useCallback } from "react";
import type { Reference } from "../types/schema.ts";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { cn } from "../../lib/utils.ts";

export interface ReferenceLightboxDetailsProps {
  reference: Reference;
  onTagClick?: (tag: string) => void;
  onProjectClick?: (projectId: string) => void;
  onTogglePin?: (id: string) => void;
}

export function ReferenceLightboxDetails({
  reference,
  onTagClick,
  onProjectClick,
  onTogglePin,
}: ReferenceLightboxDetailsProps) {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const isWeb = reference.urlOrPath.startsWith("http://") || reference.urlOrPath.startsWith("https://");

  const handleCopyPath = useCallback(() => {
    navigator.clipboard.writeText(reference.urlOrPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  }, [reference.urlOrPath]);

  const handleCopyPrompt = useCallback(() => {
    if (!reference.prompt) return;
    navigator.clipboard.writeText(reference.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }, [reference.prompt]);

  const formattedDate = new Date(reference.addedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex w-full md:w-80 flex-col justify-between border-t md:border-t-0 md:border-l border-border/60 bg-card p-4 overflow-y-auto">
      <div className="flex flex-col gap-4">
        {/* Title and Domain Header */}
        <div>
          <h4 className="text-sm font-semibold text-foreground leading-snug">
            {reference.title}
          </h4>
          {reference.domain && (
            <a
              href={reference.urlOrPath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {reference.faviconUrl ? (
                <img src={reference.faviconUrl} alt="" className="size-3 rounded-sm" />
              ) : (
                <Icon name="Globe" className="size-3" />
              )}
              <span>{reference.domain}</span>
              <Icon name="ExternalLink" className="size-2.5 opacity-70" />
            </a>
          )}
        </div>

        {/* Project and Date Metadata */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground border-y border-border/40 py-3">
          <div className="flex items-center justify-between">
            <span>Project</span>
            <button
              type="button"
              onClick={() => onProjectClick?.(reference.projectId)}
              className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Icon name="Folder" className="size-3 text-primary" />
              <span>{reference.projectName || reference.projectId}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>Added</span>
            <span>{formattedDate}</span>
          </div>
          {reference.source && (
            <div className="flex items-center justify-between">
              <span>Source</span>
              <span className="capitalize">{reference.source}</span>
            </div>
          )}
        </div>

        {/* Notes / Description */}
        {reference.notes && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Description / Notes
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-2.5 rounded-lg border border-border/40">
              {reference.notes}
            </p>
          </div>
        )}

        {/* Generation Prompt */}
        {reference.prompt && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Icon name="Sparkles" className="size-3 text-primary" />
                <span>Prompt Provenance</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Icon name={copiedPrompt ? "Check" : "Copy"} className="size-2.5" />
                <span>{copiedPrompt ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-xs italic leading-relaxed text-muted-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/50 select-text">
              {reference.prompt}
            </p>
          </div>
        )}

        {/* Tags */}
        {reference.tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Tags
            </span>
            <div className="flex flex-wrap gap-1">
              {reference.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="rounded-full bg-secondary/80 px-2 py-0.5 text-[11px] text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-border/60">
        {onTogglePin && (
          <Button
            size="sm"
            variant={reference.pinned ? "default" : "outline"}
            className="w-full gap-1.5 text-xs h-8"
            onClick={() => onTogglePin(reference.id)}
          >
            <Icon name="Pin" className={cn("size-3.5", reference.pinned && "fill-current")} />
            <span>{reference.pinned ? "Снять метку Камертона" : "Закрепить как Камертон (На столе)"}</span>
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs h-8"
            onClick={handleCopyPath}
          >
            <Icon name={copiedPath ? "Check" : "Copy"} className="size-3.5" />
            <span>{copiedPath ? "Copied!" : "Copy Path / URL"}</span>
          </Button>

          {isWeb && (
            <a
              href={reference.urlOrPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs text-foreground hover:bg-secondary transition-colors"
              title="Open link in browser"
            >
              <Icon name="ExternalLink" className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
