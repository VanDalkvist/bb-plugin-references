import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";

export interface ReferencesEmptyStateProps {
  isGlobalView: boolean;
  viewMode: "projects" | "feed";
  searchQuery: string;
  selectedTag: string | null;
  pinnedOnly: boolean;
  onClearFilters: () => void;
  onOpenAddModal: () => void;
}

export function ReferencesEmptyState({
  isGlobalView,
  viewMode,
  searchQuery,
  selectedTag,
  pinnedOnly,
  onClearFilters,
  onOpenAddModal,
}: ReferencesEmptyStateProps) {
  if (isGlobalView && viewMode === "projects") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Icon name="FolderPlus" className="mb-3 size-12 opacity-30" />
        <h3 className="text-sm font-semibold text-foreground">No projects found</h3>
        <p className="mt-1 max-w-xs text-xs">
          {searchQuery
            ? `No projects matching "${searchQuery}"`
            : "No project references collected yet. Start collecting references in any project!"}
        </p>
      </div>
    );
  }

  if (pinnedOnly) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="relative mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary/80 text-foreground">
          <Icon name="Pin" className="size-6 text-primary fill-current" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Камертон пуст</h3>
        <p className="mt-1 max-w-xs text-xs">
          Закрепляйте ключевые тактильные диорамы и стилеобразующие референсы кнопкой 📌 на карточках, чтобы держать фокус «На столе».
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 h-7 text-xs"
          onClick={onClearFilters}
        >
          Показать все референсы
        </Button>
      </div>
    );
  }

  if (searchQuery || selectedTag) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Icon name="SearchX" className="mb-3 size-12 opacity-30" />
        <h3 className="text-sm font-semibold text-foreground">No matching references</h3>
        <p className="mt-1 max-w-xs text-xs">
          {selectedTag
            ? `No references tagged with #${selectedTag}`
            : `No results for "${searchQuery}"`}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 h-7 text-xs"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <div className="relative mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary/80 text-foreground shadow-sm">
        <Icon name="Sparkles" className="size-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">No references yet</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed">
        Paste any website link or local image above, or ask the AI agent:
      </p>
      <div className="mt-3 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-[11px] font-mono text-muted-foreground">
        «Собери референсы для темной темы»
      </div>
      <Button
        size="sm"
        className="mt-4 h-8 gap-1.5 text-xs font-semibold"
        onClick={onOpenAddModal}
      >
        <Icon name="Plus" className="size-3.5" />
        <span>Add First Reference</span>
      </Button>
    </div>
  );
}
