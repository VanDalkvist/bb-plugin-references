import { useState, useCallback, useMemo } from "react";
import { useBbContext } from "@get-bb/plugin-sdk/app";
import type { ReferenceKind } from "../types/schema.ts";
import { ReferenceCard } from "./ReferenceCard.tsx";
import { ReferenceLightbox } from "./ReferenceLightbox.tsx";
import { ProjectsGridView } from "./ProjectsGridView.tsx";
import { AddReferenceModal } from "./AddReferenceModal.tsx";
import { ReferencesToolbar } from "./ReferencesToolbar.tsx";
import { ReferencesEmptyState } from "./ReferencesEmptyState.tsx";
import { useReferences } from "../hooks/useReferences.ts";
import { Icon } from "../../components/ui/icon.tsx";

const VIEW_MODE_KEY = "bb:references:viewMode";

export interface ReferencesPanelProps {
  threadId?: string;
  initialSelectedId?: string | null;
}

export function ReferencesPanel({ initialSelectedId }: ReferencesPanelProps) {
  const ctx = useBbContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => ctx?.projectId || null);

  const [viewMode, setViewMode] = useState<"projects" | "feed">(() => {
    try {
      return (localStorage.getItem(VIEW_MODE_KEY) as "projects" | "feed") || "feed";
    } catch {
      return "feed";
    }
  });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | ReferenceKind>("all");
  const [pinnedOnly, setPinnedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleSetViewMode = useCallback((mode: "projects" | "feed") => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // intentionally ignored: local storage may be restricted in sandbox
    }
  }, []);

  const {
    references,
    projects,
    tags,
    loading,
    error,
    setError,
    selectedReference,
    setSelectedReference,
    fetchData,
    handleAdd,
    handleTogglePin,
    handleRemove,
  } = useReferences({
    selectedProjectId,
    selectedTag,
    kindFilter,
    pinnedOnly,
    searchQuery,
    initialSelectedId,
    onProjectChange: setSelectedProjectId,
  });

  const pinnedCount = useMemo(() => references.filter((r) => r.pinned).length, [references]);

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
    [quickInput, isQuickAdding, handleAdd, setError]
  );

  const isGlobalView = selectedProjectId === null;

  const currentProjectName = useMemo(() => {
    if (!selectedProjectId) return "All Projects";
    const found = projects.find((p) => p.id === selectedProjectId);
    if (found?.name) return found.name;
    const ref = references.find((r) => r.projectId === selectedProjectId);
    if (ref?.projectName) return ref.projectName;
    return selectedProjectId;
  }, [selectedProjectId, projects, references]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <ReferencesToolbar
        isGlobalView={isGlobalView}
        selectedProjectId={selectedProjectId}
        currentProjectName={currentProjectName}
        referencesCount={references.length}
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setSelectedTag(null);
        }}
        onRefresh={fetchData}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        quickInput={quickInput}
        setQuickInput={setQuickInput}
        isQuickAdding={isQuickAdding}
        onQuickAdd={handleQuickAdd}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        kindFilter={kindFilter}
        setKindFilter={setKindFilter}
        pinnedOnly={pinnedOnly}
        setPinnedOnly={setPinnedOnly}
        pinnedCount={pinnedCount}
        tags={tags}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />

      {error && (
        <div className="flex items-center justify-between bg-destructive/15 px-3 py-1.5 text-xs text-destructive">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && references.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <Icon name="RotateCcw" className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : isGlobalView && viewMode === "projects" ? (
          filteredProjects.length === 0 ? (
            <ReferencesEmptyState
              isGlobalView={isGlobalView}
              viewMode={viewMode}
              searchQuery={searchQuery}
              selectedTag={selectedTag}
              pinnedOnly={pinnedOnly}
              onClearFilters={() => setSearchQuery("")}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          ) : (
            <ProjectsGridView
              projects={filteredProjects}
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setSelectedTag(null);
              }}
            />
          )
        ) : references.length === 0 ? (
          <ReferencesEmptyState
            isGlobalView={isGlobalView}
            viewMode={viewMode}
            searchQuery={searchQuery}
            selectedTag={selectedTag}
            pinnedOnly={pinnedOnly}
            onClearFilters={() => {
              setSearchQuery("");
              setSelectedTag(null);
              setPinnedOnly(false);
            }}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                showProjectBadge={isGlobalView}
                onSelect={(selected) => setSelectedReference(selected)}
                onTagClick={(tag) => setSelectedTag(tag)}
                onProjectClick={(projId) => setSelectedProjectId(projId)}
                onTogglePin={handleTogglePin}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      <ReferenceLightbox
        reference={selectedReference}
        references={references}
        onClose={() => setSelectedReference(null)}
        onSelectReference={(ref) => setSelectedReference(ref)}
        onTagClick={(tag) => {
          setSelectedReference(null);
          setSelectedTag(tag);
        }}
        onProjectClick={(projId) => {
          setSelectedReference(null);
          setSelectedProjectId(projId);
        }}
        onTogglePin={handleTogglePin}
      />

      <AddReferenceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAdd}
      />
    </div>
  );
}
