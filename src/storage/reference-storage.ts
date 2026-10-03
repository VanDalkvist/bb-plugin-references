import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Reference } from "../types/schema.ts";

export interface ReferenceStorage {
  getReferences(projectId: string): Promise<Reference[]>;
  saveReferences(projectId: string, references: Reference[]): Promise<void>;
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
}
