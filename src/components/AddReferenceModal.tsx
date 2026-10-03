import { useState, useCallback } from "react";
import type { CreateReferenceInput } from "../types/schema.ts";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";

export interface AddReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateReferenceInput) => Promise<void>;
}

export function AddReferenceModal({
  isOpen,
  onClose,
  onSubmit,
}: AddReferenceModalProps) {
  const [urlOrPath, setUrlOrPath] = useState("");
  const [title, setTitle] = useState("");
  const [rawTags, setRawTags] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedUrl = urlOrPath.trim();
      if (!trimmedUrl) {
        setError("URL or file path is required");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      const tags = rawTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      try {
        await onSubmit({
          urlOrPath: trimmedUrl,
          title: title.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          notes: notes.trim() || undefined,
          source: "manual",
        });

        // Reset form
        setUrlOrPath("");
        setTitle("");
        setRawTags("");
        setNotes("");
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to add reference");
      } finally {
        setIsSubmitting(false);
      }
    },
    [urlOrPath, title, rawTags, notes, onSubmit, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Icon name="ImagePlus" className="size-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Add Visual Reference
            </h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 rounded-full"
            onClick={onClose}
          >
            <Icon name="X" className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {error && (
            <div className="rounded-md bg-destructive/15 border border-destructive/30 p-2 text-destructive text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block font-medium text-foreground">
              Image URL or Local File Path <span className="text-destructive">*</span>
            </label>
            <Input
              value={urlOrPath}
              onChange={(e) => setUrlOrPath(e.target.value)}
              placeholder="https://... or docs/references/preview.png"
              autoFocus
              className="text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Supports web links or local workspace paths.
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-foreground">
              Title <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dark Mode Dashboard UI"
              className="text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-foreground">
              Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
            </label>
            <Input
              value={rawTags}
              onChange={(e) => setRawTags(e.target.value)}
              placeholder="ui, dark-theme, dashboard"
              className="text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-foreground">
              Notes / Design Context <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What makes this reference notable? (color palette, typography, layout pattern...)"
              rows={3}
              className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !urlOrPath.trim()}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Icon name="Loader2" className="size-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Icon name="Plus" className="size-3.5" />
                  Add Reference
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
