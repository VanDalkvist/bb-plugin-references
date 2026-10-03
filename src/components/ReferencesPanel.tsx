import { useState, useEffect, useCallback, useMemo } from "react";
import { useRpc, useRealtime, useBbContext } from "@get-bb/plugin-sdk/app";
import type { ReferencesRpcContract } from "../rpc/contract.ts";
import type { Reference, TagInfo, CreateReferenceInput } from "../types/schema.ts";
import { ReferenceCard } from "./ReferenceCard.tsx";
import { ReferenceLightbox } from "./ReferenceLightbox.tsx";
import { AddReferenceModal } from "./AddReferenceModal.tsx";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { cn } from "../../lib/utils.ts";

export interface ReferencesPanelProps {
  threadId?: string;
  initialSelectedId?: string | null;
}

export function ReferencesPanel({ initialSelectedId }: ReferencesPanelProps) {
  const rpc = useRpc<ReferencesRpcContract>();
  const ctx = useBbContext();
  const projectId = ctx?.projectId || "default";

  const [references, setReferences] = useState<Reference[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch references and tags
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [refsRes, tagsRes] = await Promise.all([
        rpc.call("references_list", {
          projectId,
          tag: selectedTag || undefined,
          query: searchQuery.trim() || undefined,
        }),
        rpc.call("references_tags", { projectId }),
      ]);

      setReferences(refsRes.references);
      setTags(tagsRes.tags);

      // If initialSelectedId was passed, open it in lightbox
      if (initialSelectedId) {
        const found = refsRes.references.find((r) => r.id === initialSelectedId);
        if (found) {
          setSelectedReference(found);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load references");
    } finally {
      setLoading(false);
    }
  }, [rpc, projectId, selectedTag, searchQuery, initialSelectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime updates: refetch when references change or open signal arrives
  useRealtime("references-changed", () => {
    fetchData();
  });

  useRealtime("references-open", (payload: unknown) => {
    const data = payload as { projectId?: string; referenceId?: string };
    if (!data.projectId || data.projectId === projectId) {
      fetchData();
      if (data.referenceId) {
        rpc.call("references_get", { projectId, id: data.referenceId }).then((res) => {
          if (res.reference) {
            setSelectedReference(res.reference);
          }
        }).catch(() => {});
      }
    }
  });

  const handleAdd = useCallback(
    async (input: CreateReferenceInput) => {
      const newRef = await rpc.call("references_add", {
        projectId,
        ...input,
      });
      setReferences((prev) => [newRef, ...prev]);
      // Also refresh tags
      rpc.call("references_tags", { projectId }).then((res) => setTags(res.tags)).catch(() => {});
    },
    [rpc, projectId]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await rpc.call("references_remove", { projectId, id });
        setReferences((prev) => prev.filter((r) => r.id !== id));
        if (selectedReference?.id === id) {
          setSelectedReference(null);
        }
        rpc.call("references_tags", { projectId }).then((res) => setTags(res.tags)).catch(() => {});
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete reference");
      }
    },
    [rpc, projectId, selectedReference]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top Header / Toolbar */}
      <div className="flex flex-col gap-2.5 border-b border-border/70 bg-card/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="Images" className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project References
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {references.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={fetchData}
              title="Refresh"
            >
              <Icon name="RotateCcw" className="size-3.5" />
            </Button>

            <Button
              size="sm"
              className="h-7 gap-1 text-xs px-2.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Icon name="Plus" className="size-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Icon
            name="Search"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, tag, notes..."
            className="h-7 pl-8 pr-7 text-xs bg-background/80"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" className="size-3" />
            </button>
          )}
        </div>

        {/* Tag Filters Row */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-medium transition-colors shrink-0",
                selectedTag === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() =>
                  setSelectedTag(selectedTag === tag.name ? null : tag.name)
                }
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-medium transition-colors shrink-0 flex items-center gap-1",
                  selectedTag === tag.name
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <span>#{tag.name}</span>
                <span className="opacity-60 text-[10px]">({tag.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={fetchData}>
              Retry
            </Button>
          </div>
        )}

        {loading && references.length === 0 ? (
          /* Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl border border-border bg-card p-2 animate-pulse space-y-2"
              >
                <div className="aspect-video w-full rounded-lg bg-muted/60" />
                <div className="h-3 w-3/4 rounded bg-muted/60" />
                <div className="h-2 w-1/2 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : references.length === 0 ? (
          /* Empty State */
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center text-muted-foreground border border-dashed border-border/70 rounded-2xl bg-card/20">
            <div className="rounded-full bg-secondary/80 p-3 mb-3 text-primary">
              <Icon name="Sparkles" className="size-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              {searchQuery || selectedTag ? "No matching references" : "Moodboard is empty"}
            </h4>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
              {searchQuery || selectedTag
                ? "Try adjusting your search query or tag filter."
                : "Ask an agent to collect visual inspiration or add images directly via CLI or button above."}
            </p>

            <div className="mt-4 flex flex-col gap-2 items-center">
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Icon name="Plus" className="size-3.5" />
                Add First Reference
              </Button>

              <code className="text-[10px] text-muted-foreground/80 bg-muted/40 px-2 py-1 rounded">
                bb references add &lt;url_or_path&gt; --open
              </code>
            </div>
          </div>
        ) : (
          /* References Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                onSelect={setSelectedReference}
                onTagClick={setSelectedTag}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      <ReferenceLightbox
        reference={selectedReference}
        onClose={() => setSelectedReference(null)}
        onTagClick={(tag) => setSelectedTag(tag)}
      />

      {/* Add Reference Modal */}
      <AddReferenceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAdd}
      />
    </div>
  );
}
