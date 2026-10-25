import type {
  Reference,
  ReferenceKind,
  CreateReferenceInput,
  ReferenceFilter,
  TagInfo,
  ProjectSummary,
} from "../types/schema.ts";
import type { ReferenceStorage } from "../storage/reference-storage.ts";
import type { ProjectResolver } from "./project-resolver.ts";
import type { MetadataScraper, ScrapedMetadata } from "./metadata-scraper.ts";
import {
  filterReferences,
  sortReferences,
  mergeReferenceUpdates,
  collectTags,
  createReferenceRecord,
  resolveAddFields,
  sortProjectSummaries,
  applyReferenceUpsert,
} from "./reference-helpers.ts";
import { KeyedAsyncMutex } from "../utils/async-mutex.ts";

export class ReferenceService {
  private storage: ReferenceStorage;
  private projectResolver?: ProjectResolver;
  private scraper?: MetadataScraper;
  private projectMutex = new KeyedAsyncMutex();

  constructor(
    storage: ReferenceStorage,
    projectResolver?: ProjectResolver,
    scraper?: MetadataScraper
  ) {
    this.storage = storage;
    this.projectResolver = projectResolver;
    this.scraper = scraper;
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

    // Auto-scrape metadata for web URLs if scraper is available
    let scraped: ScrapedMetadata | undefined;
    const isHttp =
      input.urlOrPath.startsWith("http://") || input.urlOrPath.startsWith("https://");
    if (this.scraper && isHttp) {
      scraped = await this.scraper.scrape(input.urlOrPath);
    }

    const addFields = resolveAddFields(input, scraped);

    const projectName = this.projectResolver
      ? await this.projectResolver.getProjectName(safeProjectId)
      : safeProjectId;

    return this.projectMutex.runExclusive(safeProjectId, async () => {
      const existing = await this.storage.getReferences(safeProjectId);
      const { updatedList, result } = applyReferenceUpsert(existing, addFields, {
        projectId: safeProjectId,
        projectName,
        urlOrPath: input.urlOrPath,
        source: input.source,
        aspectRatio: input.aspectRatio,
        customTitle: input.title,
        pinnedInput: input.pinned,
      });
      await this.storage.saveReferences(safeProjectId, updatedList);
      return result;
    });
  }

  async list(projectId?: string | null, filter?: ReferenceFilter): Promise<Reference[]> {
    const isAll = !projectId || projectId.trim() === "" || projectId.trim() === "all";
    const canonicalId = isAll ? null : await this.resolveProjectId(projectId);

    const refs = isAll
      ? await this.storage.getAllReferences()
      : await this.storage.getReferences(canonicalId!);

    const filtered = filterReferences(refs, filter);
    const sorted = sortReferences(filtered);

    // Enrich with human project names
    if (this.projectResolver) {
      return Promise.all(
        sorted.map(async (r) => ({
          ...r,
          projectName: await this.projectResolver!.getProjectName(r.projectId),
        }))
      );
    }

    return sorted;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const ids = await this.storage.listProjectIds();
    const summaries: ProjectSummary[] = await Promise.all(
      ids.map(async (id) => {
        const refs = await this.storage.getReferences(id);
        const previewUrls = refs
          .slice(0, 4)
          .map((r) => r.previewUrl || r.urlOrPath);

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
    return sortProjectSummaries(summaries);
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
    return this.projectMutex.runExclusive(canonicalId, async () => {
      const refs = await this.storage.getReferences(canonicalId);
      const filtered = refs.filter((ref) => ref.id !== id);
      if (filtered.length === refs.length) return false;
      await this.storage.saveReferences(canonicalId, filtered);
      return true;
    });
  }

  private async togglePinInList(projectId: string, id: string): Promise<Reference | null> {
    return this.projectMutex.runExclusive(projectId, async () => {
      const list = await this.storage.getReferences(projectId);
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) return null;
      const updated = { ...list[index]!, pinned: !list[index]!.pinned };
      list[index] = updated;
      await this.storage.saveReferences(projectId, list);
      return updated;
    });
  }

  async togglePin(
    projectId: string,
    id: string
  ): Promise<{ reference: Reference | null; pinned: boolean }> {
    const safeProjectId = (await this.resolveProjectId(projectId)) || "default";
    const direct = await this.togglePinInList(safeProjectId, id);
    if (direct) return { reference: direct, pinned: direct.pinned };

    const allProjects = await this.storage.listProjectIds();
    for (const pid of allProjects) {
      if (pid === safeProjectId) continue;
      const found = await this.togglePinInList(pid, id);
      if (found) return { reference: found, pinned: found.pinned };
    }
    return { reference: null, pinned: false };
  }

  async update(
    projectId: string,
    id: string,
    patch: Partial<Omit<Reference, "id" | "projectId" | "addedAt">>
  ): Promise<Reference | null> {
    const canonicalId = await this.resolveProjectId(projectId);
    return this.projectMutex.runExclusive(canonicalId, async () => {
      const refs = await this.storage.getReferences(canonicalId);
      const index = refs.findIndex((ref) => ref.id === id);
      if (index === -1) return null;

      const current = refs[index]!;
      const projectName = this.projectResolver
        ? await this.projectResolver.getProjectName(canonicalId)
        : current.projectName || canonicalId;

      const updated = mergeReferenceUpdates(current, { ...patch, projectName });
      refs[index] = updated;
      await this.storage.saveReferences(canonicalId, refs);
      return updated;
    });
  }

  async listTags(projectId?: string | null): Promise<TagInfo[]> {
    const isAll = !projectId || projectId.trim() === "" || projectId.trim() === "all";
    const canonicalId = isAll ? null : await this.resolveProjectId(projectId);

    const refs = isAll
      ? await this.storage.getAllReferences()
      : await this.storage.getReferences(canonicalId!);

    return collectTags(refs);
  }
}
