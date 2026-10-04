import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { cn } from "../../lib/utils.ts";
import { TagFilterBar } from "./TagFilterBar.tsx";
import { QuickAddBar } from "./QuickAddBar.tsx";
import { FilterToggleGroup } from "./FilterToggleGroup.tsx";
import type { TagInfo, ReferenceKind } from "../types/schema.ts";

export interface ReferencesToolbarProps {
  isGlobalView: boolean;
  selectedProjectId: string | null;
  currentProjectName: string;
  referencesCount: number;
  viewMode: "projects" | "feed";
  onSetViewMode: (mode: "projects" | "feed") => void;
  onSelectProject: (id: string | null) => void;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  quickInput: string;
  setQuickInput: (val: string) => void;
  isQuickAdding: boolean;
  onQuickAdd: (e: React.FormEvent) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  kindFilter: "all" | ReferenceKind;
  setKindFilter: (kind: "all" | ReferenceKind) => void;
  pinnedOnly: boolean;
  setPinnedOnly: (pinned: boolean) => void;
  pinnedCount: number;
  tags: TagInfo[];
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

export function ReferencesToolbar({
  isGlobalView,
  selectedProjectId,
  currentProjectName,
  referencesCount,
  viewMode,
  onSetViewMode,
  onSelectProject,
  onRefresh,
  onOpenAddModal,
  quickInput,
  setQuickInput,
  isQuickAdding,
  onQuickAdd,
  searchQuery,
  setSearchQuery,
  kindFilter,
  setKindFilter,
  pinnedOnly,
  setPinnedOnly,
  pinnedCount,
  tags,
  selectedTag,
  setSelectedTag,
}: ReferencesToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-border/70 bg-card/60 p-3 backdrop-blur-sm">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden text-xs">
          {isGlobalView ? (
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Icon name="Images" className="size-4 text-primary shrink-0" />
              <span>All Projects</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {referencesCount}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  onSelectProject(null);
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
                <span className="truncate" title={selectedProjectId || ""}>{currentProjectName}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground shrink-0">
                  {referencesCount}
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
                onClick={() => onSetViewMode("projects")}
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
                onClick={() => onSetViewMode("feed")}
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
            onClick={onRefresh}
            title="Refresh"
          >
            <Icon name="RotateCcw" className="size-3.5" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs px-2"
            onClick={onOpenAddModal}
            title="Open full add form"
          >
            <Icon name="Settings2" className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick Add Bar */}
      <QuickAddBar
        value={quickInput}
        onChange={setQuickInput}
        onSubmit={onQuickAdd}
        isAdding={isQuickAdding}
      />

      {/* Search bar & Type filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

        {(!isGlobalView || viewMode === "feed") && (
          <FilterToggleGroup
            kindFilter={kindFilter}
            onSetKindFilter={setKindFilter}
            pinnedOnly={pinnedOnly}
            onSetPinnedOnly={setPinnedOnly}
            pinnedCount={pinnedCount}
          />
        )}
      </div>

      {/* Tag Chips Filter Bar */}
      {(!isGlobalView || viewMode === "feed") && (
        <TagFilterBar
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      )}
    </div>
  );
}
