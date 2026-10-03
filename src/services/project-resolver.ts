export interface ProjectMetadata {
  id: string;
  name: string;
  path?: string;
}

export interface ProjectResolver {
  resolveCanonicalId(rawIdOrName?: string | null): Promise<string>;
  getProjectName(canonicalId: string): Promise<string>;
  getAllProjectMetadata(): Promise<Map<string, ProjectMetadata>>;
}

export class DefaultProjectResolver implements ProjectResolver {
  private listProjectsFn?: () => Promise<Array<{ id: string; name: string }>>;
  private cache: Map<string, ProjectMetadata> | null = null;
  private lastFetch = 0;
  private readonly TTL_MS = 10_000; // 10 second cache

  constructor(listProjectsFn?: () => Promise<Array<{ id: string; name: string }>>) {
    this.listProjectsFn = listProjectsFn;
  }

  private async fetchMetadata(): Promise<Map<string, ProjectMetadata>> {
    const now = Date.now();
    if (this.cache && now - this.lastFetch < this.TTL_MS) {
      return this.cache;
    }

    const map = new Map<string, ProjectMetadata>();

    if (this.listProjectsFn) {
      try {
        const list = await this.listProjectsFn();
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.id) {
              const meta: ProjectMetadata = {
                id: item.id,
                name: item.name || item.id,
              };
              map.set(item.id, meta);
              // Also map lowercase name to metadata for canonical ID resolution
              if (item.name && item.name !== item.id) {
                map.set(item.name.toLowerCase(), meta);
              }
            }
          }
        }
      } catch {
        // Fallback gracefully on fetch error
      }
    }

    this.cache = map;
    this.lastFetch = now;
    return map;
  }

  async getAllProjectMetadata(): Promise<Map<string, ProjectMetadata>> {
    return this.fetchMetadata();
  }

  async resolveCanonicalId(rawIdOrName?: string | null): Promise<string> {
    const raw = rawIdOrName?.trim();
    if (!raw || raw === "default") {
      return "default";
    }

    const metaMap = await this.fetchMetadata();
    // Check if directly matches an ID
    if (metaMap.has(raw)) {
      return metaMap.get(raw)!.id;
    }
    // Check if matches a project name (case-insensitive)
    const lower = raw.toLowerCase();
    if (metaMap.has(lower)) {
      return metaMap.get(lower)!.id;
    }

    return raw;
  }

  async getProjectName(canonicalId: string): Promise<string> {
    if (!canonicalId || canonicalId === "default") {
      return "Default";
    }
    const metaMap = await this.fetchMetadata();
    if (metaMap.has(canonicalId)) {
      return metaMap.get(canonicalId)!.name;
    }
    return canonicalId;
  }
}
