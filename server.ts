// bb-plugin-references — Visual references and moodboard panel for BB IDE
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { Context } from "hono";
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { rpcContract } from "./src/rpc/contract.ts";
import { FileReferenceStorage } from "./src/storage/reference-storage.ts";
import { ReferenceService } from "./src/services/reference-service.ts";
import { DefaultProjectResolver } from "./src/services/project-resolver.ts";
import { MetadataScraper } from "./src/services/metadata-scraper.ts";
import { handleImageRequest } from "./src/server/image-handler.ts";
import { createRpcHandlers } from "./src/rpc/handlers.ts";
import { registerAgentTools } from "./src/server/agent-tools.ts";
import { registerCli } from "./src/cli/register.ts";

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
  bb.rpc.register(rpcContract, createRpcHandlers(service, bb));

  // 3. CLI Command
  registerCli(bb, service);

  // 4. Native Agent Tools
  registerAgentTools(bb, service);

  bb.agents.configure(() => ({
    tools: ["references_add", "references_list", "references_pin"],
    skills: ["references"],
  }));

  bb.onDispose(() => {
    bb.log.info("References plugin disposed");
  });
}
