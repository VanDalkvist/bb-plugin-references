import { useState, useEffect, useCallback } from "react";
import type { Reference } from "../types/schema.ts";
import { resolveImageUrl, isWebUrl } from "../utils/image-url.ts";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { cn } from "../../lib/utils.ts";

export interface ReferenceLightboxProps {
  reference: Reference | null;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

export function ReferenceLightbox({
  reference,
  onClose,
  onTagClick,
}: ReferenceLightboxProps) {
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Reset zoom when reference changes
    setScale(1);
  }, [reference?.id]);

  useEffect(() => {
    if (!reference) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setScale((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === "-") {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === "0") {
        setScale(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reference, onClose]);

  const handleCopy = useCallback(() => {
    if (!reference) return;
    navigator.clipboard.writeText(reference.urlOrPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reference]);

  if (!reference) return null;

  const imgSrc = resolveImageUrl(reference.urlOrPath);
  const isWeb = isWebUrl(reference.urlOrPath);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Lightbox Container */}
      <div
        className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {reference.title}
            </h3>
            {reference.source && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {reference.source}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              title="Zoom out (-)"
            >
              <Icon name="ZoomOut" className="size-4" />
            </Button>
            <span className="min-w-10 text-center text-xs text-muted-foreground font-mono">
              {Math.round(scale * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
              title="Zoom in (+)"
            >
              <Icon name="ZoomIn" className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setScale(1)}
              title="Reset zoom (0)"
            >
              <Icon name="RotateCcw" className="size-3.5" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Copy button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={handleCopy}
              title="Copy path or URL"
            >
              <Icon name={copied ? "Check" : "Copy"} className="size-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>

            {/* External link */}
            {isWeb && (
              <a
                href={reference.urlOrPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-transparent text-sm hover:bg-state-hover"
                title="Open in new browser tab"
              >
                <Icon name="ExternalLink" className="size-4" />
              </a>
            )}

            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-full ml-1"
              onClick={onClose}
              title="Close (Esc)"
            >
              <Icon name="X" className="size-4" />
            </Button>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto bg-black/40 p-4">
          <img
            src={imgSrc}
            alt={reference.title}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
            }}
            className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md"
          />
        </div>

        {/* Footer Details */}
        <div className="flex flex-col border-t border-border/60 bg-card/90 px-4 py-3 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="truncate max-w-md font-mono text-[11px]" title={reference.urlOrPath}>
              {reference.urlOrPath}
            </span>
            <span className="text-[11px]">
              Added {new Date(reference.addedAt).toLocaleDateString()}
            </span>
          </div>

          {reference.notes && (
            <p className="mt-2 text-foreground leading-relaxed whitespace-pre-wrap">
              {reference.notes}
            </p>
          )}

          {reference.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reference.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    onClose();
                    onTagClick?.(tag);
                  }}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground hover:bg-secondary/80 hover:text-primary transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
