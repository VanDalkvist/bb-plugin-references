// bb-plugin-references — Visual references and moodboard panel for BB IDE
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { Context } from "hono";
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { rpcContract } from "./src/rpc/contract.ts";
import { FileReferenceStorage } from "./src/storage/reference-storage.ts";
import { ReferenceService } from "./src/services/reference-service.ts";
import { DefaultProjectResolver } from "./src/services/project-resolver.ts";
import { MetadataScraper } from "./src/services/metadata-scraper.ts";
import { handleCliCommand, CLI_USAGE } from "./src/cli/commands.ts";
import { handleImageRequest } from "./src/server/image-handler.ts";

export { rpcContract, type ReferencesRpcContract } from "./src/rpc/contract.ts";
export type { Reference, TagInfo } from "./src/types/schema.ts";

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("References plugin loading...");

  const settings = bb.settings.define({
    storageDir: {
      type: "string",
      label: "Storage Directory",
      description: "Path to references storage directory.",
      default: "~/.bb/references",
    },
  });

  const getStorageDir = async (): Promise<string> => {
    try {
      const cfg = await settings.get();
      const raw = cfg.storageDir || "~/.bb/references";
      if (raw.startsWith("~/")) {
        return resolve(homedir(), raw.slice(2));
      }
      return resolve(raw);
    } catch {
      return resolve(homedir(), ".bb/references");
    }
  };

  const baseStorageDir = await getStorageDir();
  const storage = new FileReferenceStorage(baseStorageDir);
  const scraper = new MetadataScraper();
  const projectResolver = new DefaultProjectResolver(async () => {
    try {
      const res = await bb.sdk.projects.list();
      if (Array.isArray(res)) {
        return res.map((p) => ({ id: p.id, name: p.name || p.id }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const service = new ReferenceService(storage, projectResolver, scraper);

  const allowedRoots = [
    homedir(),
    resolve(homedir(), "Projects"),
    baseStorageDir,
    process.cwd(),
  ];

  // 1. HTTP Endpoint: serve local images securely
  bb.http.route("GET", "/image", async (c: Context) => {
    const rawPath = c.req.query("path");
    if (!rawPath) {
      return c.text("Missing path query parameter", 400);
    }

    const result = await handleImageRequest(rawPath, allowedRoots);
    const headers: Record<string, string> = { ...result.headers };

    if (result.status !== 200) {
      return c.text(
        typeof result.body === "string" ? result.body : result.body.toString("utf-8"),
        result.status as any,
        headers
      );
    }

    const bodyData = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
    return new Response(bodyData, { status: 200, headers });
  });

  // 2. RPC Methods
  bb.rpc.register(rpcContract, {
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

      if (open) {
        // Killer feature: auto-open the references tab in BB
        bb.realtime.publish("references-open", {
          projectId: ref.projectId,
          threadId,
          referenceId: ref.id,
        });
      }

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
  });

  // 3. CLI Command
  bb.cli.register({
    name: "references",
    summary: "Visual references and moodboards for BB projects",
    commands: [
      {
        name: "list",
        summary: "List project references",
        usage: "bb references list [--project <id>] [--tag <tag>] [--search <query>] [--json]",
      },
      {
        name: "add",
        summary: "Add a reference image (URL or local file)",
        usage: "bb references add <url_or_path> [--title <title>] [--tags <t1,t2>] [--prompt <prompt>] [--open] [--json]",
      },
      {
        name: "pin",
        summary: "Pin a reference as active aesthetic anchor ('Камертон' / 'На столе')",
        usage: "bb references pin <id> [--project <id>] [--json]",
      },
      {
        name: "unpin",
        summary: "Unpin a reference from active anchor ('Камертон')",
        usage: "bb references unpin <id> [--project <id>] [--json]",
      },
      {
        name: "remove",
        summary: "Remove a reference by ID",
        usage: "bb references remove <id> [--project <id>] [--json]",
      },
      {
        name: "open",
        summary: "Open the references panel in BB IDE",
        usage: "bb references open [--project <id>] [--id <ref-id>]",
      },
      {
        name: "tags",
        summary: "List unique tags and counts",
        usage: "bb references tags [--project <id>] [--json]",
      },
    ],
    async run(argv) {
      return handleCliCommand(
        argv,
        service,
        (ch, payload) => bb.realtime.publish(ch, payload),
        process.env.BB_PROJECT_ID || "default"
      );
    },
  });

  // 4. Native Agent Tools
  bb.agents.registerTool({
    name: "references_add",
    description:
      "Add a visual reference (image URL or local image path) to the current project's moodboard, and automatically open the references panel in BB IDE.",
    parameters: z.object({
      urlOrPath: z.string().describe("Web image URL (https://...) or local file path (e.g. docs/references/hero.png)"),
      title: z.string().optional().describe("Descriptive title for the reference"),
      tags: z.array(z.string()).optional().describe("Tags for categorization (e.g. ['ui', 'dark-mode', 'dashboard'])"),
      notes: z.string().optional().describe("Design context or notes explaining what is notable about this reference"),
      prompt: z.string().optional().describe("The exact text prompt used to generate this image (when generated by an image generation tool)"),
      pinned: z.boolean().optional().describe("Mark as an active aesthetic anchor reference ('Камертон' / 'На столе')"),
      open: z.boolean().optional().default(true).describe("Whether to immediately pop open the References tab in BB IDE (default: true)"),
    }),
    async execute(params, ctx) {
      const pid = ctx.projectId || "default";
      const ref = await service.add(pid, {
        urlOrPath: params.urlOrPath,
        title: params.title,
        tags: params.tags,
        notes: params.notes,
        prompt: params.prompt,
        pinned: params.pinned,
        source: "agent",
      });

      bb.realtime.publish("references-changed", { projectId: ref.projectId });

      if (params.open !== false) {
        bb.realtime.publish("references-open", {
          projectId: ref.projectId,
          threadId: ctx.threadId,
          referenceId: ref.id,
        });
      }

      const promptInfo = ref.prompt ? `\nPrompt: "${ref.prompt}"` : "";

      return {
        content: [
          {
            type: "text",
            text: `Added reference "${ref.title}" [${ref.id}] to project "${ref.projectName || ref.projectId}".${promptInfo}\n\n::reference{id="${ref.id}" project="${ref.projectId}"}\n\n[🖼️ Open in References panel](#reference:${ref.id})`,
          },
        ],
      };
    },
  });

  bb.agents.registerTool({
    name: "references_pin",
    description:
      "Pin or unpin a reference to mark it as the project's active aesthetic anchor ('Камертон' / 'На столе').",
    parameters: z.object({
      id: z.string().describe("Reference ID to pin or unpin"),
      pinned: z.boolean().optional().describe("true to pin, false to unpin. Omit to toggle current state."),
    }),
    async execute(params, ctx) {
      const pid = ctx.projectId || "default";
      const current = await service.get(pid, params.id);
      if (!current) {
        return {
          content: [
            {
              type: "text",
              text: `Reference with ID "${params.id}" not found.`,
            },
          ],
        };
      }

      let targetPinned = !current.pinned;
      if (params.pinned !== undefined) {
        targetPinned = params.pinned;
      }

      if (current.pinned !== targetPinned) {
        await service.togglePin(pid, params.id);
        bb.realtime.publish("references-changed", { projectId: current.projectId });
      }

      return {
        content: [
          {
            type: "text",
            text: `${targetPinned ? "📌 Pinned to Камертон (На столе)" : "Unpinned from Камертон"}: "${current.title}" [${current.id}]`,
          },
        ],
      };
    },
  });

  bb.agents.registerTool({
    name: "references_list",
    description: "List visual references and moodboard items for the current project in BB IDE.",
    parameters: z.object({
      tag: z.string().optional().describe("Filter references by specific tag"),
      query: z.string().optional().describe("Search query matching title, notes, or URL"),
    }),
    async execute(params, ctx) {
      const pid = ctx.projectId || "default";
      const refs = await service.list(pid, { tag: params.tag, query: params.query });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(refs, null, 2),
          },
        ],
      };
    },
  });

  bb.agents.configure(() => ({
    tools: ["references_add", "references_list"],
    skills: ["references"],
  }));

  bb.onDispose(() => {
    bb.log.info("References plugin disposed");
  });
}
