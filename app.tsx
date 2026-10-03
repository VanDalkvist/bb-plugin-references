// bb-plugin-references — Visual references and moodboard panel frontend
import { useEffect } from "react";
import {
  definePluginApp,
  useBbNavigate,
  useRealtime,
  type PluginThreadPanelProps,
} from "@get-bb/plugin-sdk/app";
import { ReferencesPanel } from "./src/components/ReferencesPanel.tsx";
import { InlineReferenceDirective } from "./src/components/InlineReferenceDirective.tsx";
import { InlineReferencesGalleryDirective } from "./src/components/InlineReferencesGalleryDirective.tsx";
import { mountReferenceLinksContentScript } from "./src/content-scripts/reference-links.ts";
import { Button } from "./components/ui/button.tsx";
import { Icon } from "./components/ui/icon.tsx";

/**
 * Invisible overlay component that listens for:
 * 1. Agent realtime "references-open" signals
 * 2. Chat hyperlink clicks from content-script ("bb:references:open-reference")
 * and automatically pops open the references panel in BB IDE focused on the target item.
 */
function ReferencesAutoOpener() {
  const navigate = useBbNavigate();

  useRealtime("references-open", (payload: unknown) => {
    const data = payload as { projectId?: string; threadId?: string; referenceId?: string } | null;
    const initialSelectedId = data?.referenceId || null;

    navigate.openThreadPanel({
      actionId: "project-references",
      title: "References",
      params: initialSelectedId ? { initialSelectedId } : null,
    });
  });

  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; projectId?: string }>).detail;
      if (detail?.id) {
        navigate.openThreadPanel({
          actionId: "project-references",
          title: "References",
          params: { initialSelectedId: detail.id },
        });
      }
    };

    window.addEventListener("bb:references:open-reference", handleCustomOpen);
    return () => {
      window.removeEventListener("bb:references:open-reference", handleCustomOpen);
    };
  }, [navigate]);

  return null;
}

/**
 * Thread header button to quickly toggle or open the references panel in 1 click.
 */
function ReferencesHeaderButton() {
  const navigate = useBbNavigate();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={() =>
        navigate.openThreadPanel({
          actionId: "project-references",
          title: "References",
        })
      }
      title="Open Visual References"
    >
      <Icon name="Images" className="size-3.5" />
      <span className="hidden sm:inline">References</span>
    </Button>
  );
}

/**
 * Panel tab opened in the right side of the BB IDE thread view.
 */
function ThreadPanelComponent(props: PluginThreadPanelProps) {
  const params = props.params as { initialSelectedId?: string } | null;
  return (
    <ReferencesPanel
      threadId={props.threadId}
      initialSelectedId={params?.initialSelectedId ?? null}
    />
  );
}

/**
 * Nav panel for full-page project moodboard in BB sidebar.
 */
function NavPanelComponent() {
  return (
    <div className="h-full w-full overflow-hidden">
      <ReferencesPanel />
    </div>
  );
}

export default definePluginApp((app) => {
  // 1. Killer feature auto-opener overlay (realtime + chat hyperlinks)
  app.slots.experimental_appOverlay({
    id: "references-auto-opener",
    component: ReferencesAutoOpener,
  });

  // 2. Right thread panel tab
  app.slots.threadPanelAction({
    id: "project-references",
    title: "References",
    icon: "Images",
    layout: "flush",
    component: ThreadPanelComponent,
  });

  // 3. Quick button in thread header
  app.slots.experimental_threadHeaderAction({
    id: "references-header-button",
    title: "References",
    component: ReferencesHeaderButton,
  });

  // 4. Sidebar nav panel for project-wide moodboard
  app.slots.navPanel({
    id: "project-references-nav",
    title: "References",
    icon: "Images",
    path: "references",
    component: NavPanelComponent,
  });

  // 5. Chat message directives for rich inline reference previews
  app.slots.messageDirective({
    id: "reference",
    component: InlineReferenceDirective,
  });

  app.slots.messageDirective({
    id: "references",
    component: InlineReferencesGalleryDirective,
  });

  // 6. Content script for clickable reference hyperlinks in chat
  app.contentScripts.register({
    id: "reference-links",
    mount: mountReferenceLinksContentScript,
  });
});
