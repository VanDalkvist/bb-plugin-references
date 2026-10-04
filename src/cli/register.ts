import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ReferenceService } from "../services/reference-service.ts";
import { handleCliCommand } from "./commands.ts";

export function registerCli(bb: BbPluginApi, service: ReferenceService): void {
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
        summary: "Pin a reference as active aesthetic anchor",
        usage: "bb references pin <id> [--project <id>] [--json]",
      },
      {
        name: "unpin",
        summary: "Unpin a reference from active anchor",
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
}
