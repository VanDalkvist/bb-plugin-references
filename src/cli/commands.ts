import type { ReferenceService } from "../services/reference-service.ts";
import type { Reference } from "../types/schema.ts";

export interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export type RealtimePublisher = (channel: string, payload: unknown) => void;

export const CLI_USAGE = `Usage:
  bb references list [--project <id>] [--tag <tag>] [--pinned] [--search <query>] [--json]
  bb references add <url_or_path> [--title <title>] [--tags <t1,t2>] [--notes <notes>] [--prompt <prompt>] [--pinned] [--source <source>] [--project <id>] [--open] [--json]
  bb references pin <id> [--project <id>] [--json]
  bb references unpin <id> [--project <id>] [--json]
  bb references remove <id> [--project <id>] [--json]
  bb references open [--project <id>] [--id <ref-id>] [--json]
  bb references tags [--project <id>] [--json]
  bb references --help`;

function formatReference(ref: Reference): string {
  const pinStr = ref.pinned ? " 📌 [Pinned]" : "";
  const tagsStr = ref.tags.length > 0 ? ` [${ref.tags.join(", ")}]` : "";
  const notesStr = ref.notes ? ` — "${ref.notes}"` : "";
  const promptStr = ref.prompt ? ` [prompt: "${ref.prompt}"]` : "";
  return `• [${ref.id}]${pinStr} ${ref.title}${tagsStr} (${ref.urlOrPath})${notesStr}${promptStr}`;
}

const VALUE_OPTIONS = new Set([
  "--project",
  "--tag",
  "--search",
  "--title",
  "--tags",
  "--notes",
  "--prompt",
  "--source",
  "--id",
]);

const BOOLEAN_FLAGS = new Set(["--json", "--open", "--pinned"]);

export async function handleCliCommand(
  argv: string[],
  service: ReferenceService,
  publisher: RealtimePublisher,
  defaultProjectId: string = "default"
): Promise<CliResult> {
  const json = argv.includes("--json");
  const openFlag = argv.includes("--open");
  const pinnedFlag = argv.includes("--pinned");

  const getOpt = (opt: string): string | undefined => {
    const idx = argv.indexOf(opt);
    if (idx !== -1 && idx + 1 < argv.length && !argv[idx + 1]!.startsWith("--")) {
      return argv[idx + 1];
    }
    return undefined;
  };

  const projectId = getOpt("--project") || defaultProjectId || "default";

  const cleanArgs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (BOOLEAN_FLAGS.has(arg)) continue;
    if (VALUE_OPTIONS.has(arg)) {
      i++;
      continue;
    }
    cleanArgs.push(arg);
  }

  const [command, ...positional] = cleanArgs;

  const reply = (value: unknown, text: string): CliResult => ({
    exitCode: 0,
    stdout: json ? JSON.stringify(value, null, 2) : text,
  });

  const error = (msg: string, code: number = 1): CliResult => ({
    exitCode: code,
    stderr: json ? JSON.stringify({ error: msg }, null, 2) : msg,
  });

  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return reply({ usage: CLI_USAGE }, CLI_USAGE);

    case "list": {
      const tag = getOpt("--tag");
      const search = getOpt("--search");
      const refs = await service.list(projectId, {
        tag,
        query: search,
        pinned: pinnedFlag ? true : undefined,
      });

      if (refs.length === 0) {
        return reply([], `No references found for project "${projectId}".`);
      }

      const text = `Project: ${projectId} (${refs.length} references${pinnedFlag ? ", 📌 Pinned" : ""})\n` +
        refs.map(formatReference).join("\n");
      return reply(refs, text);
    }

    case "add": {
      const urlOrPath = positional[0] || getOpt("--url");
      if (!urlOrPath) {
        return error('Missing required URL or path. Usage: bb references add <url_or_path> [--title "..."]');
      }

      const title = getOpt("--title");
      const rawTags = getOpt("--tags");
      const tags = rawTags ? rawTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
      const notes = getOpt("--notes");
      const prompt = getOpt("--prompt");
      const source = getOpt("--source") || "cli";

      const ref = await service.add(projectId, {
        urlOrPath,
        title,
        tags,
        notes,
        prompt,
        pinned: pinnedFlag,
        source,
      });

      publisher("references-changed", { projectId });

      if (openFlag) {
        publisher("references-open", { projectId, referenceId: ref.id });
      }

      const text = `Added reference: ${ref.title} [${ref.id}] to project "${projectId}"${openFlag ? " (auto-open panel triggered)" : ""}`;
      return reply(ref, text);
    }

    case "pin":
    case "star":
    case "unpin":
    case "unstar": {
      const isPin = command === "pin" || command === "star";
      const id = positional[0] || getOpt("--id");
      if (!id) {
        return error(`Missing reference ID to ${isPin ? "pin" : "unpin"}. Usage: bb references ${command} <id>`);
      }

      const ref = await service.get(projectId, id);
      if (!ref) {
        return error(`Reference with ID "${id}" not found.`);
      }

      if (ref.pinned !== isPin) {
        await service.togglePin(ref.projectId, id);
        publisher("references-changed", { projectId: ref.projectId });
      }

      const msg = isPin
        ? `📌 Reference [${id}] "${ref.title}" pinned as aesthetic anchor.`
        : `Reference [${id}] "${ref.title}" unpinned.`;

      return reply({ pinned: isPin, id, projectId: ref.projectId }, msg);
    }

    case "remove": {
      const id = positional[0] || getOpt("--id");
      if (!id) {
        return error("Missing reference ID to remove. Usage: bb references remove <id>");
      }

      let removed = await service.remove(projectId, id);
      if (!removed) {
        // Fallback: search across all projects if not found in target project
        const allRefs = await service.list(null);
        const match = allRefs.find((r) => r.id === id);
        if (match) {
          removed = await service.remove(match.projectId, id);
          if (removed) {
            publisher("references-changed", { projectId: match.projectId });
            return reply(
              { removed: true, id, projectId: match.projectId },
              `Removed reference ${id} from project "${match.projectId}".`
            );
          }
        }
        return error(`Reference with ID "${id}" not found.`);
      }

      publisher("references-changed", { projectId });
      return reply({ removed: true, id }, `Removed reference ${id} from project "${projectId}".`);
    }

    case "open": {
      const id = getOpt("--id") || positional[0];
      let targetProject = projectId;
      if (id && (!targetProject || targetProject === "default")) {
        const allRefs = await service.list(null);
        const match = allRefs.find((r) => r.id === id);
        if (match) {
          targetProject = match.projectId;
        }
      }
      publisher("references-open", { projectId: targetProject, referenceId: id });
      return reply(
        { ok: true, projectId: targetProject, referenceId: id },
        `Opened references panel for project "${targetProject}"${id ? ` (selected: ${id})` : ""}.`
      );
    }

    case "tags": {
      const tags = await service.listTags(projectId);
      if (tags.length === 0) {
        return reply([], `No tags found for project "${projectId}".`);
      }

      const text = `Tags for project "${projectId}":\n` +
        tags.map((t) => `• #${t.name} (${t.count})`).join("\n");
      return reply(tags, text);
    }

    default:
      return error(`Unknown command: "${command}".\n\n${CLI_USAGE}`);
  }
}
