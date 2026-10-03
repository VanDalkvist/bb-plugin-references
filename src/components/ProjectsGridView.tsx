import { memo } from "react";
import type { ProjectSummary } from "../types/schema.ts";
import { resolveImageUrl } from "../utils/image-url.ts";
import { Icon } from "../../components/ui/icon.tsx";
import { cn } from "../../lib/utils.ts";

export interface ProjectsGridViewProps {
  projects: ProjectSummary[];
  onSelectProject: (projectId: string) => void;
}

export const ProjectsGridView = memo(function ProjectsGridView({
  projects,
  onSelectProject,
}: ProjectsGridViewProps) {
  if (projects.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center text-muted-foreground border border-dashed border-border/70 rounded-2xl bg-card/20">
        <div className="rounded-full bg-secondary/80 p-3 mb-3 text-primary">
          <Icon name="FolderPlus" className="size-6" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">No projects with references yet</h4>
        <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
          References added to any project will be organized here by project folder.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {projects.map((proj) => (
        <div
          key={proj.id}
          onClick={() => onSelectProject(proj.id)}
          className={cn(
            "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
            "cursor-pointer transition-all duration-150 ease-out hover:border-primary/50 hover:shadow-md hover:bg-card/90"
          )}
        >
          {/* Project Preview Collage (2x2 grid or single image) */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted/40 p-1.5">
            {proj.previewUrls.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Icon name="Images" className="size-8 opacity-30" />
              </div>
            ) : proj.previewUrls.length === 1 ? (
              <img
                src={resolveImageUrl(proj.previewUrls[0]!)}
                alt={proj.name}
                loading="lazy"
                className="h-full w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full grid-cols-2 gap-1">
                {proj.previewUrls.slice(0, 4).map((url, i) => (
                  <div key={i} className="relative h-full w-full overflow-hidden rounded-md bg-black/20">
                    <img
                      src={resolveImageUrl(url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Reference count badge */}
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white/95 backdrop-blur-sm">
              {proj.count} {proj.count === 1 ? "reference" : "references"}
            </span>
          </div>

          {/* Project Details Footer */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary shrink-0">
                <Icon name="Folder" className="size-3.5" />
              </div>
              <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {proj.name}
              </span>
            </div>

            <Icon name="ChevronRight" className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      ))}
    </div>
  );
});
