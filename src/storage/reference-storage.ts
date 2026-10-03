import { readFile, writeFile, rename, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Reference } from "../types/schema.ts";

export interface ReferenceStorage {
  getReferences(projectId: string): Promise<Reference[]>;
  saveReferences(projectId: string, references: Reference[]): Promise<void>;
  listProjectIds(): Promise<string[]>;
  getAllReferences(): Promise<Reference[]>;
}

export class FileReferenceStorage implements ReferenceStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private sanitizeProjectId(projectId: string): string {
    // Sanitize projectId for filesystem safety
    return projectId.replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  }

  private getFilePath(projectId: string): string {
    const safeId = this.sanitizeProjectId(projectId);
    return join(this.baseDir, `${safeId}.json`);
  }

  async getReferences(projectId: string): Promise<Reference[]> {
    const filePath = this.getFilePath(projectId);
    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const data = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed as Reference[];
      }
      return [];
    } catch {
      // In case of corrupt JSON or read error, return empty array safely
      return [];
    }
  }

  async saveReferences(projectId: string, references: Reference[]): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    const filePath = this.getFilePath(projectId);
    const tempPath = `${filePath}.${randomUUID()}.tmp`;

    const content = JSON.stringify(references, null, 2);
    // Atomic write pattern: write to tmp file then atomic rename
    await writeFile(tempPath, content, "utf-8");
    await rename(tempPath, filePath);
  }

  async listProjectIds(): Promise<string[]> {
    if (!existsSync(this.baseDir)) {
      return [];
    }
    try {
      const entries = await readdir(this.baseDir);
      const projectIds: string[] = [];
      for (const entry of entries) {
        if (entry.endsWith(".json") && !entry.endsWith(".tmp")) {
          projectIds.push(entry.slice(0, -".json".length));
        }
      }
      return projectIds.sort();
    } catch {
      return [];
    }
  }

  async getAllReferences(): Promise<Reference[]> {
    const ids = await this.listProjectIds();
    const lists = await Promise.all(ids.map((id) => this.getReferences(id)));
    const all = lists.flat();

    // Deduplicate by urlOrPath (case-insensitive & trimmed) or id
    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated: Reference[] = [];

    // Sort newest first before deduplication so latest version wins
    all.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    for (const ref of all) {
      const urlKey = ref.urlOrPath.trim().toLowerCase();
      if (!seenUrls.has(urlKey) && !seenIds.has(ref.id)) {
        seenUrls.add(urlKey);
        seenIds.add(ref.id);
        deduplicated.push(ref);
      }
    }

    return deduplicated;
  }
}
