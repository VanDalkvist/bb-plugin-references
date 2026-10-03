import type { ReferenceService } from "../services/reference-service.ts";
import type { Reference } from "../types/schema.ts";

export interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export type RealtimePublisher = (channel: string, payload: unknown) => void;

export const CLI_USAGE = `Usage:
  bb references list [--project <id>] [--tag <tag>] [--search <query>] [--json]
  bb references add <url_or_path> [--title <title>] [--tags <t1,t2>] [--notes <notes>] [--source <source>] [--project <id>] [--open] [--json]
  bb references remove <id> [--project <id>] [--json]
  bb references open [--project <id>] [--id <ref-id>] [--json]
  bb references tags [--project <id>] [--json]
  bb references --help`;

function formatReference(ref: Reference): string {
  const tagsStr = ref.tags.length > 0 ? ` [${ref.tags.join(", ")}]` : "";
  const notesStr = ref.notes ? ` — "${ref.notes}"` : "";
  return `• [${ref.id}] ${ref.title}${tagsStr} (${ref.urlOrPath})${notesStr}`;
}

export async function handleCliCommand(
  argv: string[],
  service: ReferenceService,
  publisher: RealtimePublisher,
  defaultProjectId: string = "default"
): Promise<CliResult> {
  const json = argv.includes("--json");
  const openFlag = argv.includes("--open");

  // Helper to extract option value
  const getOpt = (opt: string): string | undefined => {
    const idx = argv.indexOf(opt);
    if (idx !== -1 && idx + 1 < argv.length && !argv[idx + 1]!.startsWith("--")) {
      return argv[idx + 1];
    }
    return undefined;
  };

  const projectId = getOpt("--project") || defaultProjectId || "default";

  // Filter out flag pairs for positional parsing
  const cleanArgs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--json" || arg === "--open") {
      continue;
    }
    if (
      arg === "--project" ||
      arg === "--tag" ||
      arg === "--search" ||
      arg === "--title" ||
      arg === "--tags" ||
      arg === "--notes" ||
      arg === "--source" ||
      arg === "--id"
    ) {
      i++; // skip next value
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
      const refs = await service.list(projectId, { tag, query: search });

      if (refs.length === 0) {
        return reply([], `No references found for project "${projectId}".`);
      }

      const text = `Project: ${projectId} (${refs.length} references)\n` +
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
      const source = getOpt("--source") || "cli";

      const ref = await service.add(projectId, {
        urlOrPath,
        title,
        tags,
        notes,
        source,
      });

      publisher("references-changed", { projectId });

      if (openFlag) {
        publisher("references-open", { projectId, referenceId: ref.id });
      }

      const text = `Added reference: ${ref.title} [${ref.id}] to project "${projectId}"${openFlag ? " (auto-open panel triggered)" : ""}`;
      return reply(ref, text);
    }

    case "remove": {
      const id = positional[0] || getOpt("--id");
      if (!id) {
        return error("Missing reference ID to remove. Usage: bb references remove <id>");
      }

      const removed = await service.remove(projectId, id);
      if (!removed) {
        return error(`Reference with ID "${id}" not found in project "${projectId}".`);
      }

      publisher("references-changed", { projectId });
      return reply({ removed: true, id }, `Removed reference ${id} from project "${projectId}".`);
    }

    case "open": {
      const id = getOpt("--id") || positional[0];
      publisher("references-open", { projectId, referenceId: id });
      return reply(
        { ok: true, projectId, referenceId: id },
        `Opened references panel for project "${projectId}"${id ? ` (selected: ${id})` : ""}.`
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
