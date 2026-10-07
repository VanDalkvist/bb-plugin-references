import type { PluginContentScriptContext, PluginContentScriptDisposer } from "@get-bb/plugin-sdk/app";

/**
 * Frontend content script that intercepts reference hyperlinks inside BB chat
 * messages (e.g. `[View Reference](#reference:c88bd761)` or `bb://references/c88bd761`)
 * and triggers opening the references panel focused on that image.
 */
export function mountReferenceLinksContentScript(
  _context: PluginContentScriptContext
): PluginContentScriptDisposer {
  const handleClick = (e: MouseEvent) => {
    // Check if clicked element is or is inside an anchor link
    const target = (e.target as HTMLElement | null)?.closest("a");
    if (!target) return;

    const href = target.getAttribute("href");
    if (!href) return;

    let refId: string | null = null;
    let projectId: string | null = null;

    // Pattern 1: #reference:<id> or #ref:<id> or #reference:<project>/<id>
    if (href.startsWith("#reference:") || href.startsWith("#ref:")) {
      const payload = href.replace(/^#(reference|ref):/, "").trim();
      if (payload.includes("/")) {
        const parts = payload.split("/");
        projectId = parts[0] || null;
        refId = parts[1] || null;
      } else {
        refId = payload;
      }
    }
    // Pattern 2: bb://references/<id> or bb://references?id=<id>&project=<project>
    else if (href.startsWith("bb://references")) {
      try {
        const url = new URL(href);
        const pathSegments = url.pathname.split("/").filter(Boolean);
        refId = pathSegments[0] || url.searchParams.get("id");
        projectId = url.searchParams.get("project") || url.searchParams.get("projectId");
      } catch {
        const match = href.match(/bb:\/\/references\/([^?#]+)/);
        if (match) {
          refId = match[1] || null;
        }
      }
    }

    if (refId && refId.trim().length > 0) {
      refId = refId.trim();
      e.preventDefault();
      e.stopPropagation();

      // Dispatch global window event picked up by ReferencesAutoOpener in app.tsx
      window.dispatchEvent(
        new CustomEvent("bb:references:open-reference", {
          detail: {
            id: refId,
            projectId,
          },
        })
      );
    }
  };

  document.addEventListener("click", handleClick, true);

  return () => {
    document.removeEventListener("click", handleClick, true);
  };
}
