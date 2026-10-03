import { useState, useEffect, useCallback, useMemo } from "react";
import { useRpc, useBbNavigate, useBbContext, type PluginMessageDirectiveProps } from "@get-bb/plugin-sdk/app";
import type { ReferencesRpcContract } from "../rpc/contract.ts";
import type { Reference } from "../types/schema.ts";
import { resolveImageUrl, isWebUrl } from "../utils/image-url.ts";
import { ReferenceLightbox } from "./ReferenceLightbox.tsx";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { cn } from "../../lib/utils.ts";

export function InlineReferenceDirective({ attributes }: PluginMessageDirectiveProps) {
  const rpc = useRpc<ReferencesRpcContract>();
  const navigate = useBbNavigate();
  const ctx = useBbContext();

  const id = attributes.id?.trim() || null;
  const projectAttr = attributes.project?.trim() || attributes.projectId?.trim() || null;
  const urlAttr = attributes.url?.trim() || attributes.path?.trim() || null;
  const titleAttr = attributes.title?.trim() || null;

  const [reference, setReference] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch reference by ID if supplied
  useEffect(() => {
    if (!id) {
      if (urlAttr) {
        // Construct ad-hoc reference object from attributes
        setReference({
          id: "ad-hoc",
          projectId: projectAttr || ctx?.projectId || "default",
          kind: (attributes.kind as any) || "website",
          urlOrPath: urlAttr,
          title: titleAttr || urlAttr.split("/").pop() || "Reference",
          tags: attributes.tags ? attributes.tags.split(",").map((t) => t.trim()) : [],
          addedAt: new Date().toISOString(),
          notes: attributes.notes?.trim() || null,
          source: "chat",
        });
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const pid = projectAttr || ctx?.projectId || "default";

    rpc.call("references_get", { projectId: pid, id })
      .then((res) => {
        if (cancelled) return;
        if (res.reference) {
          setReference(res.reference);
        } else {
          setError("Reference not found");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load reference");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, projectAttr, urlAttr, titleAttr, attributes.tags, attributes.notes, ctx?.projectId, rpc]);

  const handleOpenPanel = useCallback(() => {
    navigate.openThreadPanel({
      actionId: "project-references",
      title: "References",
      params: id ? { initialSelectedId: id } : null,
    });
  }, [navigate, id]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!reference) return;
      navigator.clipboard.writeText(reference.urlOrPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [reference]
  );

  const imgSrc = useMemo(() => {
    if (!reference) return "";
    const targetImage = reference.previewUrl || reference.urlOrPath;
    return resolveImageUrl(targetImage);
  }, [reference]);

  if (loading) {
    return (
      <div className="my-2 inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/60 p-2.5 text-xs text-muted-foreground animate-pulse backdrop-blur-sm">
        <div className="size-10 rounded-lg bg-muted/70" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-32 rounded bg-muted/70" />
          <div className="h-2.5 w-20 rounded bg-muted/60" />
        </div>
      </div>
    );
  }

  if (error || !reference) {
    return (
      <div className="my-2 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Icon name="ImageOff" className="size-3.5 opacity-60" />
        <span>{error || "Reference unavailable"}</span>
        {id && <code className="text-[10px] opacity-75">#{id}</code>}
      </div>
    );
  }

  return (
    <>
      <div className="my-2.5 max-w-md overflow-hidden rounded-xl border border-border/80 bg-card text-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-center gap-3 p-2.5">
          {/* Thumbnail preview with zoom trigger */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="group relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-muted/40"
            title="Click to zoom image"
          >
            <img
              src={imgSrc}
              alt={reference.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="Maximize2" className="size-3.5 text-white" />
            </div>
          </div>

          {/* Details */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="truncate text-xs font-semibold text-foreground">
                {reference.title}
              </span>
              {reference.projectName && (
                <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-secondary-foreground">
                  {reference.projectName}
                </span>
              )}
            </div>

            {reference.notes && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground leading-normal">
                {reference.notes}
              </p>
            )}

            {reference.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {reference.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] text-muted-foreground/80 bg-secondary/50 px-1.5 py-0.2 rounded"
                  >
                    #{tag}
                  </span>
                ))}
                {reference.tags.length > 3 && (
                  <span className="text-[9px] text-muted-foreground/60">
                    +{reference.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            {isWebUrl(reference.urlOrPath) && (
              <a
                href={reference.urlOrPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Open site in new tab"
              >
                <Icon name="ExternalLink" className="size-3.5" />
              </a>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy URL/path"}
            >
              <Icon name={copied ? "Check" : "Copy"} className="size-3.5" />
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1 px-2 text-[11px] font-medium shadow-none hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={handleOpenPanel}
              title="Open full references panel"
            >
              <Icon name="PanelRight" className="size-3" />
              <span>Panel</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox modal for previewing from chat */}
      <ReferenceLightbox
        reference={isLightboxOpen ? reference : null}
        references={[reference]}
        onClose={() => setIsLightboxOpen(false)}
        onSelectReference={setReference}
      />
    </>
  );
}
