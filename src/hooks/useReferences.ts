import { useState, useEffect, useCallback, useRef } from "react";
import { useRpc, useRealtime, useBbContext } from "@get-bb/plugin-sdk/app";
import type { ReferencesRpcContract } from "../rpc/contract.ts";
import type { Reference, TagInfo, CreateReferenceInput, ProjectSummary, ReferenceKind } from "../types/schema.ts";

export interface UseReferencesOptions {
  selectedProjectId: string | null;
  selectedTag: string | null;
  kindFilter: "all" | ReferenceKind;
  pinnedOnly: boolean;
  searchQuery: string;
  initialSelectedId?: string | null;
  onProjectChange?: (id: string | null) => void;
}

export function useReferences({
  selectedProjectId,
  selectedTag,
  kindFilter,
  pinnedOnly,
  searchQuery,
  initialSelectedId,
  onProjectChange,
}: UseReferencesOptions) {
  const rpc = useRpc<ReferencesRpcContract>();
  const ctx = useBbContext();

  const [references, setReferences] = useState<Reference[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);

  // Track the initialSelectedId that has already been consumed so it only opens once
  const consumedInitialIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [refsRes, tagsRes, projectsRes] = await Promise.all([
        rpc.call("references_list", {
          projectId: selectedProjectId ?? null,
          tag: selectedTag ?? null,
          kind: kindFilter === "all" ? null : kindFilter,
          pinned: pinnedOnly ? true : null,
          query: searchQuery.trim() ? searchQuery.trim() : null,
        }),
        rpc.call("references_tags", {
          projectId: selectedProjectId ?? null,
        }),
        rpc.call("projects_list", null),
      ]);

      setReferences(refsRes.references);
      setTags(tagsRes.tags);
      setProjects(projectsRes.projects);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load references");
    } finally {
      setLoading(false);
    }
  }, [rpc, selectedProjectId, selectedTag, kindFilter, pinnedOnly, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Consume initialSelectedId only ONCE when a new non-null id is provided
  useEffect(() => {
    if (!initialSelectedId || consumedInitialIdRef.current === initialSelectedId) {
      return;
    }

    // Try finding in loaded references first
    const found = references.find((r) => r.id === initialSelectedId);
    if (found) {
      setSelectedReference(found);
      consumedInitialIdRef.current = initialSelectedId;
      return;
    }

    // If not found in current list, fetch directly once
    rpc.call("references_get", {
      projectId: selectedProjectId || ctx?.projectId || "default",
      id: initialSelectedId,
    })
      .then((res) => {
        if (res.reference) {
          setSelectedReference(res.reference);
        }
      })
      .catch(() => {})
      .finally(() => {
        consumedInitialIdRef.current = initialSelectedId;
      });
  }, [initialSelectedId, references, selectedProjectId, ctx?.projectId, rpc]);

  useRealtime("references-changed", () => {
    fetchData();
  });

  const handleAdd = useCallback(
    async (input: CreateReferenceInput) => {
      const pid = selectedProjectId || ctx?.projectId || "default";
      const newRef = await rpc.call("references_add", {
        projectId: pid,
        urlOrPath: input.urlOrPath,
        title: input.title ?? null,
        kind: input.kind ?? null,
        tags: input.tags ?? null,
        notes: input.notes ?? null,
        previewUrl: input.previewUrl ?? null,
        faviconUrl: input.faviconUrl ?? null,
        domain: input.domain ?? null,
        source: input.source ?? null,
        aspectRatio: input.aspectRatio ?? null,
      });

      setReferences((prev) => [newRef, ...prev.filter((r) => r.id !== newRef.id)]);
      rpc.call("references_tags", { projectId: selectedProjectId ?? null })
        .then((res) => setTags(res.tags))
        .catch(() => {});
      rpc.call("projects_list", null)
        .then((res) => setProjects(res.projects))
        .catch(() => {});
    },
    [rpc, selectedProjectId, ctx?.projectId]
  );

  const handleTogglePin = useCallback(
    async (id: string) => {
      try {
        setReferences((prev) =>
          prev.map((r) => (r.id === id ? { ...r, pinned: !r.pinned } : r))
        );
        if (selectedReference?.id === id) {
          setSelectedReference((prev) => (prev ? { ...prev, pinned: !prev.pinned } : null));
        }

        const res = await rpc.call("references_toggle_pin", {
          projectId: selectedProjectId ?? null,
          id,
        });

        if (res.reference) {
          setReferences((prev) =>
            prev.map((r) => (r.id === id ? res.reference! : r))
          );
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to toggle pin");
        fetchData();
      }
    },
    [rpc, selectedProjectId, selectedReference, fetchData]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        const ref = references.find((r) => r.id === id);
        const pid = ref?.projectId || selectedProjectId || "default";
        await rpc.call("references_remove", { projectId: pid, id });
        setReferences((prev) => prev.filter((r) => r.id !== id));
        if (selectedReference?.id === id) {
          setSelectedReference(null);
        }
        rpc.call("references_tags", { projectId: selectedProjectId ?? null })
          .then((res) => setTags(res.tags))
          .catch(() => {});
        rpc.call("projects_list", null)
          .then((res) => setProjects(res.projects))
          .catch(() => {});
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete reference");
      }
    },
    [rpc, references, selectedProjectId, selectedReference]
  );

  return {
    references,
    projects,
    tags,
    loading,
    error,
    setError,
    selectedReference,
    setSelectedReference,
    fetchData,
    handleAdd,
    handleTogglePin,
    handleRemove,
  };
}
