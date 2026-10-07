import type { BbPluginApi, PluginRpcHandlers } from "@get-bb/plugin-sdk";
import type { ReferenceService } from "../services/reference-service.ts";
import type { ReferencesRpcContract } from "./contract.ts";

export function createRpcHandlers(
  service: ReferenceService,
  bb: BbPluginApi
): PluginRpcHandlers<ReferencesRpcContract> {
  return {
    references_list: async (input) => {
      const pid = input?.projectId?.trim();
      const refs = await service.list(pid ? pid : null, {
        tag: input?.tag || undefined,
        kind: input?.kind || undefined,
        pinned: input?.pinned !== undefined ? (input.pinned ?? undefined) : undefined,
        query: input?.query || undefined,
      });
      return { references: refs };
    },

    references_get: async ({ projectId, id }) => {
      const pid = projectId?.trim() || "default";
      let ref = await service.get(pid, id);
      if (!ref) {
        // Fallback across all projects if not found in specific projectId
        const allRefs = await service.list(null);
        ref = allRefs.find((r) => r.id === id) || null;
      }
      return { reference: ref };
    },

    references_add: async ({
      projectId,
      urlOrPath,
      title,
      tags,
      notes,
      prompt,
      pinned,
      source,
      aspectRatio,
      open,
      threadId,
    }) => {
      const pid = projectId?.trim() || "default";
      const ref = await service.add(pid, {
        urlOrPath,
        title,
        tags,
        notes,
        prompt,
        pinned: pinned ?? false,
        source: source || "rpc",
        aspectRatio,
      });

      // Ephemeral broadcast to keep all open reference views fresh
      bb.realtime.publish("references-changed", { projectId: ref.projectId });

      return ref;
    },

    references_remove: async ({ projectId, id }) => {
      const pid = projectId?.trim() || "default";
      const removed = await service.remove(pid, id);
      if (removed) {
        bb.realtime.publish("references-changed", { projectId: pid });
      }
      return { removed };
    },

    references_toggle_pin: async ({ projectId, id }) => {
      const pid = projectId?.trim() || "default";
      const result = await service.togglePin(pid, id);
      if (result.reference) {
        bb.realtime.publish("references-changed", { projectId: result.reference.projectId });
      }
      return result;
    },

    references_tags: async (input) => {
      const pid = input?.projectId?.trim();
      const tags = await service.listTags(pid ? pid : null);
      return { tags };
    },

    references_open: async ({ projectId, threadId, referenceId }) => {
      const pid = projectId?.trim() || "default";
      bb.realtime.publish("references-open", {
        projectId: pid,
        threadId,
        referenceId,
      });
      return { ok: true };
    },

    projects_list: async () => {
      const projects = await service.listProjects();
      return { projects };
    },
  };
}
