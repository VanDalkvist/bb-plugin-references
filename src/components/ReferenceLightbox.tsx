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

  // Compute current index in references array
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground truncate max-w-sm">
              {reference.title}
            </h3>

            {reference.pinned && (
              <span className="flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                <Icon name="Pin" className="size-2.5 fill-current" />
                <span>Anchor</span>
              </span>
            )}

            {hasMultiple && (
              <span className="text-xs text-muted-foreground shrink-0">
                ({currentIndex + 1} of {references.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center rounded-lg border border-border bg-background/80 p-0.5 text-xs">
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground"
                onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                title="Zoom out (-)"
              >
                <Icon name="Minus" className="size-3" />
              </Button>
              <button
                type="button"
                onClick={() => setScale(1)}
                className="px-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                title="Reset zoom (0)"
              >
                {Math.round(scale * 100)}%
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground"
                onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
                title="Zoom in (+)"
              >
                <Icon name="Plus" className="size-3" />
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

        {/* Main Body */}
        <div className="relative flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Navigation Arrows */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-110"
                title="Previous reference (Left Arrow)"
              >
                <Icon name="ChevronLeft" className="size-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 md:right-[330px] top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-110"
                title="Next reference (Right Arrow)"
              >
                <Icon name="ChevronRight" className="size-5" />
              </button>
            </>
          )}

          {/* Image Viewport */}
          <div className="relative flex flex-1 items-center justify-center overflow-auto bg-black/40 p-4">
            {targetImg ? (
              <img
                src={imgSrc}
                alt={reference.title}
                style={{ transform: `scale(${scale})` }}
                className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-100 ease-out shadow-lg"
              />
            ) : isWebsite ? (
              <div className="flex h-64 w-96 flex-col items-center justify-center rounded-2xl bg-card p-6 text-center border border-border shadow-xl">
                {reference.faviconUrl ? (
                  <img src={reference.faviconUrl} alt="" className="size-16 rounded-xl mb-3 shadow-md" />
                ) : (
                  <Icon name="Globe" className="size-16 text-primary mb-3" />
                )}
                <h3 className="text-base font-bold text-foreground">{reference.title}</h3>
                <span className="text-xs text-muted-foreground mt-1">{reference.domain || "Website"}</span>
                {isWeb && (
                  <a
                    href={reference.urlOrPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    <span>Visit Website</span>
                    <Icon name="ExternalLink" className="size-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Icon name="ImageOff" className="size-16 opacity-30 mb-2" />
                <span className="text-sm">Image unavailable</span>
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
    </div>
  );
}
