import { useState, useEffect, useCallback } from "react";
import { useRpc, useBbNavigate, useBbContext, type PluginMessageDirectiveProps } from "@get-bb/plugin-sdk/app";
import type { ReferencesRpcContract } from "../rpc/contract.ts";
import type { Reference } from "../types/schema.ts";
import { resolveImageUrl } from "../utils/image-url.ts";
import { ReferenceLightbox } from "./ReferenceLightbox.tsx";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";

export function InlineReferencesGalleryDirective({ attributes }: PluginMessageDirectiveProps) {
  const rpc = useRpc<ReferencesRpcContract>();
  const navigate = useBbNavigate();
  const ctx = useBbContext();

  const projectId = attributes.project || attributes.projectId || ctx?.projectId || null;
  const tag = attributes.tag || null;
  const query = attributes.query || attributes.search || null;
  const idsAttr = attributes.ids || null;

  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    rpc.call("references_list", {
      projectId: projectId || null,
      tag: tag || null,
      query: query || null,
    })
      .then((res) => {
        if (cancelled) return;
        let list = res.references;
        if (idsAttr) {
          const idSet = new Set(idsAttr.split(",").map((s) => s.trim().toLowerCase()));
          list = list.filter((r) => idSet.has(r.id.toLowerCase()));
        }
        setReferences(list.slice(0, 6)); // Display up to 6 preview items in strip
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, tag, query, idsAttr, rpc]);

  const handleOpenPanel = useCallback(() => {
    navigate.openThreadPanel({
      actionId: "project-references",
      title: "References",
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="my-2 flex gap-2 overflow-x-auto py-1 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="size-16 shrink-0 rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  if (references.length === 0) {
    return null;
  }

  return (
    <>
      <div className="my-2.5 max-w-lg overflow-hidden rounded-xl border border-border/80 bg-card p-2.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Icon name="Images" className="size-3.5 text-primary" />
            <span>References {tag ? `(#${tag})` : ""}</span>
            <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[10px] text-muted-foreground">
              {references.length}
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={handleOpenPanel}
          >
            <span>Open Panel</span>
            <Icon name="ArrowRight" className="size-3" />
          </Button>
        </div>

        {/* Thumbnail gallery strip */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {references.map((ref) => (
            <div
              key={ref.id}
              onClick={() => setSelectedReference(ref)}
              className="group relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-muted/40 transition-transform hover:scale-105 hover:border-primary/50"
              title={`${ref.title} (click to view)`}
            >
              <img
                src={resolveImageUrl(ref.urlOrPath)}
                alt={ref.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Icon name="Maximize2" className="size-3 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReferenceLightbox
        reference={selectedReference}
        references={references}
        onClose={() => setSelectedReference(null)}
        onSelectReference={setSelectedReference}
      />
    </>
  );
}
