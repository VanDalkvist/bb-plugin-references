import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import type {
  Reference,
  CreateReferenceInput,
  ReferenceFilter,
  TagInfo,
  ProjectSummary,
} from "../types/schema.ts";
import type { ReferenceStorage } from "../storage/reference-storage.ts";
import type { ProjectResolver } from "./project-resolver.ts";

export class ReferenceService {
  private storage: ReferenceStorage;
  private projectResolver?: ProjectResolver;

  constructor(storage: ReferenceStorage, projectResolver?: ProjectResolver) {
    this.storage = storage;
    this.projectResolver = projectResolver;
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

  private async resolveProjectId(projectId?: string | null): Promise<string> {
    const raw = projectId?.trim();
    if (!raw || raw === "default") {
      return "default";
    }
    if (this.projectResolver) {
      return this.projectResolver.resolveCanonicalId(raw);
    }
    return raw;
  }

  async add(projectId: string, input: CreateReferenceInput): Promise<Reference> {
    const safeProjectId = await this.resolveProjectId(projectId);
    const title = input.title?.trim() || this.deriveTitle(input.urlOrPath);
    const tags = this.normalizeTags(input.tags || undefined);
    const projectName = this.projectResolver
      ? await this.projectResolver.getProjectName(safeProjectId)
      : safeProjectId;

    const existing = await this.storage.getReferences(safeProjectId);
    const normalizedUrl = input.urlOrPath.trim().toLowerCase();

    // AP-035 Idempotency: Check if this reference already exists in the project
    const existingIndex = existing.findIndex(
      (r) => r.urlOrPath.trim().toLowerCase() === normalizedUrl
    );

    if (existingIndex !== -1) {
      const current = existing[existingIndex]!;
      const updated: Reference = {
        ...current,
        title: input.title?.trim() || current.title,
        tags: input.tags ? this.normalizeTags(input.tags) : current.tags,
        notes: input.notes !== undefined ? (input.notes?.trim() || null) : current.notes,
        source: input.source?.trim() || current.source,
        aspectRatio: input.aspectRatio !== undefined ? (input.aspectRatio ?? null) : current.aspectRatio,
        projectName,
      };
      existing[existingIndex] = updated;
      await this.storage.saveReferences(safeProjectId, existing);
      return updated;
    }

    const ref: Reference = {
      id: randomUUID().slice(0, 8),
      projectId: safeProjectId,
      projectName,
      urlOrPath: input.urlOrPath.trim(),
      title,
      tags,
      addedAt: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      source: input.source?.trim() || "manual",
      aspectRatio: input.aspectRatio ?? null,
    };

    // Put newest references first
    await this.storage.saveReferences(safeProjectId, [ref, ...existing]);
    return ref;
  }

  async list(projectId?: string | null, filter?: ReferenceFilter): Promise<Reference[]> {
    const isAll = !projectId || projectId.trim() === "" || projectId.trim() === "all";
    const canonicalId = isAll ? null : await this.resolveProjectId(projectId);

    const refs = isAll
      ? await this.storage.getAllReferences()
      : await this.storage.getReferences(canonicalId!);

    let result = refs;

    if (filter?.tag) {
      const targetTag = filter.tag.trim().toLowerCase();
      result = result.filter((ref) =>
        ref.tags.some((t) => t.toLowerCase() === targetTag)
      );
    }

    if (filter?.query) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter((ref) => {
        const titleMatch = ref.title.toLowerCase().includes(q);
        const notesMatch = ref.notes?.toLowerCase().includes(q) ?? false;
        const urlMatch = ref.urlOrPath.toLowerCase().includes(q);
        const tagMatch = ref.tags.some((t) => t.toLowerCase().includes(q));
        const projectMatch = ref.projectId.toLowerCase().includes(q);
        return titleMatch || notesMatch || urlMatch || tagMatch || projectMatch;
      });
    }

    // Enrich with human project names
    if (this.projectResolver) {
      const enriched = await Promise.all(
        result.map(async (r) => ({
          ...r,
          projectName: await this.projectResolver!.getProjectName(r.projectId),
        }))
      );
      return enriched;
    }

    return result;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const ids = await this.storage.listProjectIds();
    const summaries: ProjectSummary[] = await Promise.all(
      ids.map(async (id) => {
        const refs = await this.storage.getReferences(id);
        const previewUrls = refs
          .slice(0, 4)
          .map((r) => r.urlOrPath);

        const name = this.projectResolver
          ? await this.projectResolver.getProjectName(id)
          : id;

        return {
          id,
          name,
          count: refs.length,
          previewUrls,
          lastUpdatedAt: refs[0]?.addedAt || null,
        };
      })
    );

    // Sort by last updated descending, then by count descending
    return summaries.sort((a, b) => {
      const timeA = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
      const timeB = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
      return timeB - timeA || b.count - a.count;
    });
  }

  async get(projectId: string, id: string): Promise<Reference | null> {
    const canonicalId = await this.resolveProjectId(projectId);
    const refs = await this.storage.getReferences(canonicalId);
    const found = refs.find((ref) => ref.id === id);
    if (!found) return null;

    if (this.projectResolver) {
      return {
        ...found,
        projectName: await this.projectResolver.getProjectName(found.projectId),
      };
    }
    return found;
  }

  async remove(projectId: string, id: string): Promise<boolean> {
    const canonicalId = await this.resolveProjectId(projectId);
    const refs = await this.storage.getReferences(canonicalId);
    const filtered = refs.filter((ref) => ref.id !== id);

    if (filtered.length === refs.length) {
      return false;
    }

    await this.storage.saveReferences(canonicalId, filtered);
    return true;
  }

  async update(
    projectId: string,
    id: string,
    patch: Partial<Omit<Reference, "id" | "projectId" | "addedAt">>
  ): Promise<Reference | null> {
    const canonicalId = await this.resolveProjectId(projectId);
    const refs = await this.storage.getReferences(canonicalId);
    const index = refs.findIndex((ref) => ref.id === id);

    if (index === -1) {
      return null;
    }

    const current = refs[index]!;
    const projectName = this.projectResolver
      ? await this.projectResolver.getProjectName(canonicalId)
      : current.projectName || canonicalId;

    const updated: Reference = {
      ...current,
      title: patch.title !== undefined ? (patch.title?.trim() || current.title) : current.title,
      urlOrPath: patch.urlOrPath !== undefined ? (patch.urlOrPath?.trim() || current.urlOrPath) : current.urlOrPath,
      tags: patch.tags !== undefined ? this.normalizeTags(patch.tags || undefined) : current.tags,
      notes: patch.notes !== undefined ? (patch.notes?.trim() || null) : current.notes,
      source: patch.source !== undefined ? (patch.source?.trim() || current.source) : current.source,
      aspectRatio: patch.aspectRatio !== undefined ? (patch.aspectRatio ?? null) : current.aspectRatio,
      projectName,
    };

    refs[index] = updated;
    await this.storage.saveReferences(canonicalId, refs);
    return updated;
  }

  async listTags(projectId?: string | null): Promise<TagInfo[]> {
    const isAll = !projectId || projectId.trim() === "" || projectId.trim() === "all";
    const canonicalId = isAll ? null : await this.resolveProjectId(projectId);

    const refs = isAll
      ? await this.storage.getAllReferences()
      : await this.storage.getReferences(canonicalId!);

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
