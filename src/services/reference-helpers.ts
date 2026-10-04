import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { Reference, ReferenceFilter, ReferenceKind, TagInfo, ProjectSummary, CreateReferenceInput } from "../types/schema.ts";
import type { ScrapedMetadata } from "./metadata-scraper.ts";

export function deriveReferenceTitle(urlOrPath: string): string {
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

export function normalizeReferenceTags(tags?: string[] | null): string[] {
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

export function filterReferences(refs: Reference[], filter?: ReferenceFilter): Reference[] {
  if (!filter) return refs;
  let result = refs;

  if (filter.kind) {
    result = result.filter((ref) => (ref.kind || "image") === filter.kind);
  }

  if (filter.pinned !== undefined && filter.pinned !== null) {
    result = result.filter((ref) => (ref.pinned ?? false) === filter.pinned);
  }

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
      const promptMatch = ref.prompt?.toLowerCase().includes(q) ?? false;
      const urlMatch = ref.urlOrPath.toLowerCase().includes(q);
      const tagMatch = ref.tags.some((t) => t.toLowerCase().includes(q));
      const projectMatch = ref.projectId.toLowerCase().includes(q);
      const domainMatch = ref.domain?.toLowerCase().includes(q) ?? false;
      return (
        titleMatch ||
        notesMatch ||
        promptMatch ||
        urlMatch ||
        tagMatch ||
        projectMatch ||
        domainMatch
      );
    });
  }

  return result;
}

export function sortReferences(refs: Reference[]): Reference[] {
  return [...refs].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0;
    const pinB = b.pinned ? 1 : 0;
    if (pinB !== pinA) return pinB - pinA;
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });
}

export function mergeReferenceUpdates(
  current: Reference,
  patch: Partial<Reference>
): Reference {
  return {
    ...current,
    kind: patch.kind || current.kind,
    title: patch.title !== undefined ? (patch.title?.trim() || current.title) : current.title,
    urlOrPath: patch.urlOrPath !== undefined ? (patch.urlOrPath?.trim() || current.urlOrPath) : current.urlOrPath,
    tags: patch.tags !== undefined ? normalizeReferenceTags(patch.tags || undefined) : current.tags,
    notes: patch.notes !== undefined ? (patch.notes?.trim() || null) : current.notes,
    prompt: patch.prompt !== undefined ? (patch.prompt?.trim() || null) : (current.prompt ?? null),
    previewUrl: patch.previewUrl !== undefined ? patch.previewUrl : current.previewUrl,
    faviconUrl: patch.faviconUrl !== undefined ? patch.faviconUrl : current.faviconUrl,
    domain: patch.domain !== undefined ? patch.domain : current.domain,
    pinned: patch.pinned !== undefined ? (patch.pinned ?? false) : current.pinned,
    source: patch.source !== undefined ? (patch.source?.trim() || current.source) : current.source,
    aspectRatio: patch.aspectRatio !== undefined ? (patch.aspectRatio ?? null) : current.aspectRatio,
    projectName: patch.projectName || current.projectName,
  };
}

export function collectTags(refs: Reference[]): TagInfo[] {
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
  return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function createReferenceRecord(params: {
  projectId: string;
  projectName?: string | null;
  kind: ReferenceKind;
  urlOrPath: string;
  title: string;
  tags: string[];
  notes?: string | null;
  prompt?: string | null;
  pinned: boolean;
  previewUrl?: string | null;
  faviconUrl?: string | null;
  domain?: string | null;
  source?: string | null;
  aspectRatio?: number | null;
}): Reference {
  return {
    id: randomUUID().slice(0, 8),
    projectId: params.projectId,
    projectName: params.projectName,
    kind: params.kind,
    urlOrPath: params.urlOrPath.trim(),
    title: params.title,
    tags: params.tags,
    addedAt: new Date().toISOString(),
    notes: params.notes ?? null,
    prompt: params.prompt ?? null,
    pinned: params.pinned,
    previewUrl: params.previewUrl ?? null,
    faviconUrl: params.faviconUrl ?? null,
    domain: params.domain ?? null,
    source: params.source?.trim() || "manual",
    aspectRatio: params.aspectRatio ?? null,
  };
}

export function sortProjectSummaries(summaries: ProjectSummary[]): ProjectSummary[] {
  return summaries.sort((a, b) => {
    const timeA = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
    const timeB = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
    return timeB - timeA || b.count - a.count;
  });
}

export function resolveAddFields(
  input: CreateReferenceInput,
  scraped?: ScrapedMetadata
) {
  const kind: ReferenceKind = input.kind || scraped?.kind || "image";
  const title = input.title?.trim() || scraped?.title || deriveReferenceTitle(input.urlOrPath);
  const previewUrl = input.previewUrl !== undefined ? input.previewUrl : (scraped?.previewUrl ?? null);
  const faviconUrl = input.faviconUrl !== undefined ? input.faviconUrl : (scraped?.faviconUrl ?? null);
  const domain = input.domain || scraped?.domain || undefined;

  const rawTags = [...(input.tags || [])];
  if (domain && !rawTags.includes(domain)) {
    rawTags.push(domain);
  }
  const tags = normalizeReferenceTags(rawTags);
  const prompt = input.prompt !== undefined ? (input.prompt?.trim() || null) : null;
  const pinned = input.pinned === true;
  const notes =
    input.notes !== undefined
      ? (input.notes?.trim() || null)
      : (scraped?.description ? scraped.description.trim() : null);

  return { kind, title, previewUrl, faviconUrl, domain, tags, prompt, pinned, notes };
}
