import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import type { Reference, CreateReferenceInput, ReferenceFilter, TagInfo } from "../types/schema.ts";
import type { ReferenceStorage } from "../storage/reference-storage.ts";

export class ReferenceService {
  private storage: ReferenceStorage;

  constructor(storage: ReferenceStorage) {
    this.storage = storage;
  }

  private deriveTitle(urlOrPath: string): string {
    try {
      if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
        const url = new URL(urlOrPath);
        const pathPart = url.pathname.split("/").filter(Boolean).pop();
        if (pathPart && pathPart.length > 0) {
          return decodeURIComponent(pathPart);
        }
        return url.hostname;
      }
      const base = basename(urlOrPath);
      return base.length > 0 ? base : urlOrPath;
    } catch {
      return urlOrPath;
    }
  }

  private normalizeTags(tags?: string[] | null): string[] {
    if (!tags || !Array.isArray(tags)) return [];
    const set = new Set<string>();
    for (const tag of tags) {
      const clean = tag.trim().toLowerCase();
      if (clean.length > 0) {
        set.add(clean);
      }
    }
    return Array.from(set);
  }

  async add(projectId: string, input: CreateReferenceInput): Promise<Reference> {
    const safeProjectId = projectId.trim() || "default";
    const title = input.title?.trim() || this.deriveTitle(input.urlOrPath);
    const tags = this.normalizeTags(input.tags);

    const ref: Reference = {
      id: randomUUID().slice(0, 8),
      projectId: safeProjectId,
      urlOrPath: input.urlOrPath.trim(),
      title,
      tags,
      addedAt: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      source: input.source?.trim() || "manual",
      aspectRatio: input.aspectRatio ?? null,
    };

    const existing = await this.storage.getReferences(safeProjectId);
    // Put newest references first
    await this.storage.saveReferences(safeProjectId, [ref, ...existing]);
    return ref;
  }

  async list(projectId: string, filter?: ReferenceFilter): Promise<Reference[]> {
    const safeProjectId = projectId.trim() || "default";
    const refs = await this.storage.getReferences(safeProjectId);

    if (!filter) {
      return refs;
    }

    let result = refs;

    if (filter.tag) {
      const targetTag = filter.tag.trim().toLowerCase();
      result = result.filter((ref) =>
        ref.tags.some((t) => t.toLowerCase() === targetTag)
      );
    }

    if (filter.query) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter((ref) => {
        const titleMatch = ref.title.toLowerCase().includes(q);
        const notesMatch = ref.notes?.toLowerCase().includes(q) ?? false;
        const urlMatch = ref.urlOrPath.toLowerCase().includes(q);
        const tagMatch = ref.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || notesMatch || urlMatch || tagMatch;
      });
    }

    return result;
  }

  async get(projectId: string, id: string): Promise<Reference | null> {
    const refs = await this.storage.getReferences(projectId);
    return refs.find((ref) => ref.id === id) ?? null;
  }

  async remove(projectId: string, id: string): Promise<boolean> {
    const safeProjectId = projectId.trim() || "default";
    const refs = await this.storage.getReferences(safeProjectId);
    const filtered = refs.filter((ref) => ref.id !== id);

    if (filtered.length === refs.length) {
      return false;
    }

    await this.storage.saveReferences(safeProjectId, filtered);
    return true;
  }

  async update(
    projectId: string,
    id: string,
    patch: Partial<Omit<Reference, "id" | "projectId" | "addedAt">>
  ): Promise<Reference | null> {
    const safeProjectId = projectId.trim() || "default";
    const refs = await this.storage.getReferences(safeProjectId);
    const index = refs.findIndex((ref) => ref.id === id);

    if (index === -1) {
      return null;
    }

    const current = refs[index]!;
    const updated: Reference = {
      ...current,
      title: patch.title !== undefined ? (patch.title?.trim() || current.title) : current.title,
      urlOrPath: patch.urlOrPath !== undefined ? (patch.urlOrPath?.trim() || current.urlOrPath) : current.urlOrPath,
      tags: patch.tags !== undefined ? this.normalizeTags(patch.tags || undefined) : current.tags,
      notes: patch.notes !== undefined ? (patch.notes?.trim() || null) : current.notes,
      source: patch.source !== undefined ? (patch.source?.trim() || current.source) : current.source,
      aspectRatio: patch.aspectRatio !== undefined ? (patch.aspectRatio ?? null) : current.aspectRatio,
    };

    refs[index] = updated;
    await this.storage.saveReferences(safeProjectId, refs);
    return updated;
  }

  async listTags(projectId: string): Promise<TagInfo[]> {
    const safeProjectId = projectId.trim() || "default";
    const refs = await this.storage.getReferences(safeProjectId);
    const map = new Map<string, number>();

    for (const ref of refs) {
      for (const tag of ref.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }

    const result: TagInfo[] = [];
    for (const [name, count] of map.entries()) {
      result.push({ name, count });
    }

    // Sort by count descending, then alphabetically
    result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return result;
  }
}
