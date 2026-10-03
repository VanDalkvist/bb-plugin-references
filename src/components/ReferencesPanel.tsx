import { useState, useEffect, useCallback, useMemo } from "react";
import { useRpc, useRealtime, useBbContext } from "@get-bb/plugin-sdk/app";
import type { ReferencesRpcContract } from "../rpc/contract.ts";
import type { Reference, TagInfo, CreateReferenceInput, ProjectSummary, ReferenceKind } from "../types/schema.ts";
import { ReferenceCard } from "./ReferenceCard.tsx";
import { ReferenceLightbox } from "./ReferenceLightbox.tsx";
import { ProjectsGridView } from "./ProjectsGridView.tsx";
import { AddReferenceModal } from "./AddReferenceModal.tsx";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { cn } from "../../lib/utils.ts";

const VIEW_MODE_KEY = "bb:references:viewMode";

export interface ReferencesPanelProps {
  threadId?: string;
  initialSelectedId?: string | null;
}

export function ReferencesPanel({ initialSelectedId }: ReferencesPanelProps) {
  const rpc = useRpc<ReferencesRpcContract>();
  const ctx = useBbContext();

  // If user is inside a specific project, default to it; otherwise null (All Projects)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => ctx?.projectId || null);

  // View mode when viewing All Projects: 'projects' (folder grid) vs 'feed' (all items)
  const [viewMode, setViewMode] = useState<"projects" | "feed">(() => {
    try {
      return (localStorage.getItem(VIEW_MODE_KEY) as "projects" | "feed") || "feed";
    } catch {
      return "feed";
    }
  });

  const [references, setReferences] = useState<Reference[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | ReferenceKind>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zero-friction quick-add bar
  const [quickInput, setQuickInput] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleSetViewMode = useCallback((mode: "projects" | "feed") => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  }, []);

  // Fetch references and projects
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [refsRes, tagsRes, projectsRes] = await Promise.all([
        rpc.call("references_list", {
          projectId: selectedProjectId ?? null,
          tag: selectedTag ?? null,
          kind: kindFilter === "all" ? null : kindFilter,
          query: searchQuery.trim() ? searchQuery.trim() : null,
        }),
        rpc.call("references_tags", {
          projectId: selectedProjectId ?? null,
        }),
        rpc.call("projects_list", null),
      ]);

      setReferences(refsRes.references);
      setTags(tagsRes.tags);
      setProjects(projectsRes.projects);

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
  }, [rpc, selectedProjectId, selectedTag, kindFilter, searchQuery, initialSelectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime updates: refetch when references change or open signal arrives
  useRealtime("references-changed", () => {
    fetchData();
  });

  useRealtime("references-open", (payload: unknown) => {
    const data = payload as { projectId?: string; referenceId?: string };
    if (data.projectId && data.projectId !== selectedProjectId) {
      setSelectedProjectId(data.projectId);
    }
    fetchData();
    if (data.referenceId) {
      rpc.call("references_get", { projectId: data.projectId || selectedProjectId || "default", id: data.referenceId })
        .then((res) => {
          if (res.reference) {
            setSelectedReference(res.reference);
          }
        })
        .catch(() => {});
    }
  });

  const handleAdd = useCallback(
    async (input: CreateReferenceInput) => {
      const pid = selectedProjectId || ctx?.projectId || "default";
      const newRef = await rpc.call("references_add", {
        projectId: pid,
        urlOrPath: input.urlOrPath,
        title: input.title ?? null,
        kind: input.kind ?? null,
        tags: input.tags ?? null,
        notes: input.notes ?? null,
        previewUrl: input.previewUrl ?? null,
        faviconUrl: input.faviconUrl ?? null,
        domain: input.domain ?? null,
        source: input.source ?? null,
        aspectRatio: input.aspectRatio ?? null,
      });

      setReferences((prev) => [newRef, ...prev.filter((r) => r.id !== newRef.id)]);
      rpc.call("references_tags", { projectId: selectedProjectId ?? null })
        .then((res) => setTags(res.tags))
        .catch(() => {});
      rpc.call("projects_list", null)
        .then((res) => setProjects(res.projects))
        .catch(() => {});
    },
    [rpc, selectedProjectId, ctx?.projectId]
  );

  // Quick 1-click Enter Add
  const handleQuickAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const val = quickInput.trim();
      if (!val || isQuickAdding) return;

      try {
        setIsQuickAdding(true);
        setError(null);
        await handleAdd({ urlOrPath: val });
        setQuickInput("");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to add reference");
      } finally {
        setIsQuickAdding(false);
      }
    },
    [quickInput, isQuickAdding, handleAdd]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        const ref = references.find((r) => r.id === id);
        const pid = ref?.projectId || selectedProjectId || "default";
        await rpc.call("references_remove", { projectId: pid, id });
        setReferences((prev) => prev.filter((r) => r.id !== id));
        if (selectedReference?.id === id) {
          setSelectedReference(null);
        }
        rpc.call("references_tags", { projectId: selectedProjectId ?? null })
          .then((res) => setTags(res.tags))
          .catch(() => {});
        rpc.call("projects_list", null)
          .then((res) => setProjects(res.projects))
          .catch(() => {});
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete reference");
      }
    },
    [rpc, references, selectedProjectId, selectedReference]
  );

  // Filter projects by search query if in projects view
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const isGlobalView = selectedProjectId === null;

  const currentProjectName = useMemo(() => {
    if (!selectedProjectId) return "All Projects";
    const found = projects.find((p) => p.id === selectedProjectId);
    if (found?.name) return found.name;
    const ref = references.find((r) => r.projectId === selectedProjectId);
    if (ref?.projectName) return ref.projectName;
    return selectedProjectId;
  }, [selectedProjectId, projects, references]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top Header / Toolbar */}
      <div className="flex flex-col gap-2.5 border-b border-border/70 bg-card/60 p-3 backdrop-blur-sm">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden text-xs">
            {isGlobalView ? (
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Icon name="Images" className="size-4 text-primary shrink-0" />
                <span>All Projects</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {references.length}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(null);
                    setSelectedTag(null);
                  }}
                  className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Icon name="ArrowLeft" className="size-3.5" />
                  <span>All Projects</span>
                </button>
                <span className="text-muted-foreground/60">/</span>
                <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                  <Icon name="Folder" className="size-3.5 text-primary shrink-0" />
                  <span className="truncate" title={selectedProjectId}>{currentProjectName}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground shrink-0">
                    {references.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle (only when in All Projects) */}
            {isGlobalView && (
              <div className="flex items-center rounded-lg border border-border bg-background/80 p-0.5">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("projects")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    viewMode === "projects"
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Projects list view"
                >
                  <Icon name="Folder" className="size-3" />
                  <span className="hidden sm:inline">Projects</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("feed")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    viewMode === "feed"
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="All references feed"
                >
                  <Icon name="LayoutGrid" className="size-3" />
                  <span className="hidden sm:inline">All</span>
                </button>
              </div>
            )}

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
              variant="outline"
              className="h-7 gap-1 text-xs px-2"
              onClick={() => setIsAddModalOpen(true)}
              title="Open full add form"
            >
              <Icon name="Settings2" className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Zero-friction Quick Add Bar: paste URL or path + Enter */}
        <form onSubmit={handleQuickAdd} className="relative flex items-center gap-1.5">
          <div className="relative flex-1">
            <Icon
              name="Plus"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
            />
            <Input
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Paste website link or image path + Enter to add..."
              disabled={isQuickAdding}
              className="h-8 pl-8 pr-16 text-xs bg-background/90 border-border/80 focus-visible:border-primary shadow-inner"
            />
            {isQuickAdding && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-primary animate-pulse font-medium">
                Fetching…
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!quickInput.trim() || isQuickAdding}
            className="h-8 px-2.5 text-xs font-semibold gap-1 shrink-0"
          >
            <Icon name="CornerDownLeft" className="size-3" />
            <span>Add</span>
          </Button>
        </form>

        {/* Search bar & Type filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Icon
              name="Search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isGlobalView && viewMode === "projects"
                  ? "Search projects..."
                  : "Search references by title, domain, notes..."
              }
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

          {/* Kind Filter Switch (All | Images | Websites) */}
          {(!isGlobalView || viewMode === "feed") && (
            <div className="flex items-center rounded-lg border border-border bg-background/80 p-0.5 shrink-0 self-start sm:self-auto text-[11px]">
              <button
                type="button"
                onClick={() => setKindFilter("all")}
                className={cn(
                  "rounded-md px-2 py-0.5 font-medium transition-colors",
                  kindFilter === "all"
                    ? "bg-secondary text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setKindFilter("image")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors",
                  kindFilter === "image"
                    ? "bg-secondary text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon name="Images" className="size-3" />
                <span>Images</span>
              </button>
              <button
                type="button"
                onClick={() => setKindFilter("website")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors",
                  kindFilter === "website"
                    ? "bg-secondary text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon name="Globe" className="size-3" />
                <span>Websites</span>
              </button>
            </div>
          )}
        </div>

        {/* Tag Filters Row (only in feed mode or specific project mode) */}
        {(!isGlobalView || viewMode === "feed") && tags.length > 0 && (
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
              All Tags
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

        {loading && references.length === 0 && projects.length === 0 ? (
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
        ) : isGlobalView && viewMode === "projects" ? (
          /* Projects Folders View */
          <ProjectsGridView
            projects={filteredProjects}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              setSelectedTag(null);
            }}
          />
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
                ? "Try adjusting your search query, kind, or tag filter."
                : "Paste any link (website, github repo, or image) in the bar above and hit Enter!"}
            </p>
          </div>
        ) : (
          /* References Grid Feed */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                showProjectBadge={isGlobalView}
                onSelect={setSelectedReference}
                onTagClick={setSelectedTag}
                onProjectClick={(id) => {
                  setSelectedProjectId(id);
                  setSelectedTag(null);
                }}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal with Next/Prev Arrow Navigation */}
      <ReferenceLightbox
        reference={selectedReference}
        references={references}
        onClose={() => setSelectedReference(null)}
        onSelectReference={setSelectedReference}
        onTagClick={(tag) => setSelectedTag(tag)}
        onProjectClick={(id) => {
          setSelectedReference(null);
          setSelectedProjectId(id);
          setSelectedTag(null);
        }}
      />

      {/* Full Add Reference Modal */}
      <AddReferenceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAdd}
      />
    </div>
  );
}
