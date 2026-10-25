import { useState, useEffect, useCallback, useMemo } from "react";
import type { Reference } from "../types/schema.ts";
import { resolveImageUrl, isWebUrl } from "../utils/image-url.ts";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { ReferenceLightboxDetails } from "./ReferenceLightboxDetails.tsx";

export interface ReferenceLightboxProps {
  reference: Reference | null;
  references?: Reference[];
  onClose: () => void;
  onSelectReference?: (reference: Reference) => void;
  onTagClick?: (tag: string) => void;
  onProjectClick?: (projectId: string) => void;
  onTogglePin?: (id: string) => void;
}

export function ReferenceLightbox({
  reference,
  references = [],
  onClose,
  onSelectReference,
  onTagClick,
  onProjectClick,
  onTogglePin,
}: ReferenceLightboxProps) {
  const [scale, setScale] = useState(1);

  const currentIndex = useMemo(() => {
    if (!reference || references.length === 0) return -1;
    return references.findIndex((r) => r.id === reference.id);
  }, [reference, references]);

  const hasMultiple = references.length > 1 && currentIndex !== -1;

  const handlePrev = useCallback(() => {
    if (!hasMultiple || !onSelectReference) return;
    const prevIndex = (currentIndex - 1 + references.length) % references.length;
    const prevRef = references[prevIndex];
    if (prevRef) {
      setScale(1);
      onSelectReference(prevRef);
    }
  }, [hasMultiple, currentIndex, references, onSelectReference]);

  const handleNext = useCallback(() => {
    if (!hasMultiple || !onSelectReference) return;
    const nextIndex = (currentIndex + 1) % references.length;
    const nextRef = references[nextIndex];
    if (nextRef) {
      setScale(1);
      onSelectReference(nextRef);
    }
  }, [hasMultiple, currentIndex, references, onSelectReference]);

  useEffect(() => {
    setScale(1);
  }, [reference?.id]);

  useEffect(() => {
    if (!reference) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
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
  }, [reference, onClose, handlePrev, handleNext]);

  if (!reference) return null;

  const targetImg = reference.previewUrl || reference.urlOrPath;
  const imgSrc = resolveImageUrl(targetImg);
  const isWeb = isWebUrl(reference.urlOrPath);
  const isWebsite = reference.kind === "website" || reference.kind === "github";

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground overflow-hidden animate-in fade-in duration-150">
      {/* Top Header Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Back to gallery (Esc)"
          >
            <Icon name="ArrowLeft" className="size-4" />
          </Button>

          <span className="text-xs font-semibold text-foreground truncate max-w-[150px] sm:max-w-xs">
            {reference.title}
          </span>

          {reference.pinned && (
            <span className="flex shrink-0 items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground shadow-xs">
              <Icon name="Pin" className="size-2 fill-current" />
              <span>Anchor</span>
            </span>
          )}

          {hasMultiple && (
            <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
              ({currentIndex + 1}/{references.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
            <Button
              size="icon"
              variant="ghost"
              className="size-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              title="Zoom out (-)"
            >
              <Icon name="Minus" className="size-2.5" />
            </Button>
            <button
              type="button"
              onClick={() => setScale(1)}
              className="px-1 font-mono text-[9px] text-muted-foreground hover:text-foreground"
              title="Reset zoom (0)"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="size-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
              title="Zoom in (+)"
            >
              <Icon name="Plus" className="size-2.5" />
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close (Esc)"
          >
            <Icon name="X" className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="relative flex flex-1 flex-col overflow-y-auto lg:flex-row overflow-x-hidden">
        {/* Image Viewport */}
        <div className="relative flex min-h-[220px] max-h-[45vh] lg:max-h-none lg:flex-1 items-center justify-center overflow-auto bg-black/25 p-3 shrink-0">
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform hover:scale-110 hover:bg-black"
                title="Previous reference (Left Arrow)"
              >
                <Icon name="ChevronLeft" className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform hover:scale-110 hover:bg-black"
                title="Next reference (Right Arrow)"
              >
                <Icon name="ChevronRight" className="size-4" />
              </button>
            </>
          )}

          {targetImg ? (
            <img
              src={imgSrc}
              alt={reference.title}
              decoding="async"
              style={{ transform: `scale(${scale})` }}
              className="max-h-full max-w-full rounded-md object-contain transition-transform duration-100 ease-out shadow-xs"
            />
          ) : isWebsite ? (
            <div className="flex h-48 w-full max-w-xs flex-col items-center justify-center rounded-xl bg-card p-4 text-center border border-border shadow-xs">
              {reference.faviconUrl ? (
                <img src={reference.faviconUrl} alt="" className="size-10 rounded-lg mb-2 shadow-xs" />
              ) : (
                <Icon name="Globe" className="size-10 text-primary mb-2" />
              )}
              <h4 className="text-sm font-semibold text-foreground line-clamp-1">{reference.title}</h4>
              <span className="text-[11px] text-muted-foreground mt-0.5">{reference.domain || "Website"}</span>
              {isWeb && (
                <a
                  href={reference.urlOrPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span>Open URL</span>
                  <Icon name="ExternalLink" className="size-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Icon name="ImageOff" className="size-10 opacity-30 mb-1.5" />
              <span className="text-xs">Image unavailable</span>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <ReferenceLightboxDetails
          reference={reference}
          onTagClick={onTagClick}
          onProjectClick={onProjectClick}
          onTogglePin={onTogglePin}
        />
      </div>
    </div>
  );
}
