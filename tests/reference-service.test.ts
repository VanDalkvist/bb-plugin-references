import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ReferenceService } from "../src/services/reference-service.ts";
import { FileReferenceStorage } from "../src/storage/reference-storage.ts";

describe("ReferenceService (TDD)", () => {
  let tempDir: string;
  let storage: FileReferenceStorage;
  let service: ReferenceService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bb-refs-test-"));
    storage = new FileReferenceStorage(tempDir);
    service = new ReferenceService(storage);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("adds a reference and generates default title and id", async () => {
    const ref = await service.add("proj-1", {
      urlOrPath: "https://example.com/assets/dark-dashboard.png",
      tags: ["UI", "dark-mode", "ui"],
      notes: "Inspiration for dark mode dashboard",
      source: "manual",
    });

    assert.ok(ref.id, "Reference should have an id");
    assert.equal(ref.projectId, "proj-1");
    assert.equal(ref.title, "dark-dashboard.png");
    assert.deepEqual(ref.tags, ["ui", "dark-mode"]); // deduplicated and lowercased
    assert.equal(ref.notes, "Inspiration for dark mode dashboard");
    assert.equal(ref.source, "manual");
    assert.ok(ref.addedAt);

    const list = await service.list("proj-1");
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, ref.id);
  });

  test("uses explicit title when provided", async () => {
    const ref = await service.add("proj-1", {
      urlOrPath: "docs/references/hero.png",
      title: "Main Landing Hero",
      tags: ["marketing"],
    });

    assert.equal(ref.title, "Main Landing Hero");
    assert.equal(ref.urlOrPath, "docs/references/hero.png");
  });

  test("enforces project isolation when querying a specific project (AP-041)", async () => {
    await service.add("proj-1", {
      urlOrPath: "https://example.com/proj1.png",
      title: "Project 1 Ref",
    });
    await service.add("proj-2", {
      urlOrPath: "https://example.com/proj2.png",
      title: "Project 2 Ref",
    });

    const listProj1 = await service.list("proj-1");
    const listProj2 = await service.list("proj-2");

    assert.equal(listProj1.length, 1);
    assert.equal(listProj1[0]?.title, "Project 1 Ref");

    assert.equal(listProj2.length, 1);
    assert.equal(listProj2[0]?.title, "Project 2 Ref");
  });

  test("returns all references across all projects when projectId is null or 'all'", async () => {
    await service.add("proj-1", {
      urlOrPath: "https://example.com/proj1.png",
      title: "Project 1 Ref",
      tags: ["tag1"],
    });
    await service.add("proj-2", {
      urlOrPath: "https://example.com/proj2.png",
      title: "Project 2 Ref",
      tags: ["tag2"],
    });

    const allRefsNull = await service.list(null);
    assert.equal(allRefsNull.length, 2);

    const allRefsAll = await service.list("all");
    assert.equal(allRefsAll.length, 2);

    // Can filter across all projects
    const filteredAll = await service.list(null, { tag: "tag2" });
    assert.equal(filteredAll.length, 1);
    assert.equal(filteredAll[0]?.title, "Project 2 Ref");
  });

  test("lists all projects with summaries", async () => {
    await service.add("ferma", {
      urlOrPath: "https://example.com/ferma-ui.png",
      title: "Ferma Dashboard",
    });
    await service.add("ferma", {
      urlOrPath: "https://example.com/ferma-lights.png",
      title: "Ferma Lights",
    });
    await service.add("aura-light", {
      urlOrPath: "https://example.com/aura.png",
      title: "Aura Screen Sync",
    });

    const projects = await service.listProjects();
    assert.equal(projects.length, 2);

    const fermaSummary = projects.find((p) => p.id === "ferma");
    assert.ok(fermaSummary);
    assert.equal(fermaSummary.count, 2);
    assert.equal(fermaSummary.previewUrls.length, 2);

    const auraSummary = projects.find((p) => p.id === "aura-light");
    assert.ok(auraSummary);
    assert.equal(auraSummary.count, 1);
  });

  test("filters references by tag", async () => {
    await service.add("proj-1", {
      urlOrPath: "https://example.com/img1.png",
      title: "Ref 1",
      tags: ["ui", "mobile"],
    });
    await service.add("proj-1", {
      urlOrPath: "https://example.com/img2.png",
      title: "Ref 2",
      tags: ["ui", "desktop"],
    });
    await service.add("proj-1", {
      urlOrPath: "https://example.com/img3.png",
      title: "Ref 3",
      tags: ["branding"],
    });

    const uiRefs = await service.list("proj-1", { tag: "ui" });
    assert.equal(uiRefs.length, 2);

    const desktopRefs = await service.list("proj-1", { tag: "desktop" });
    assert.equal(desktopRefs.length, 1);
    assert.equal(desktopRefs[0]?.title, "Ref 2");

    const nonExistent = await service.list("proj-1", { tag: "unknown" });
    assert.equal(nonExistent.length, 0);
  });

  test("filters references by query search string", async () => {
    await service.add("proj-1", {
      urlOrPath: "https://example.com/auth-screen.png",
      title: "Login Flow",
      notes: "Clean minimal form with biometric option",
      tags: ["auth"],
    });
    await service.add("proj-1", {
      urlOrPath: "https://example.com/settings.png",
      title: "Settings View",
      notes: "Account preferences",
      tags: ["settings"],
    });

    const searchForm = await service.list("proj-1", { query: "biometric" });
    assert.equal(searchForm.length, 1);
    assert.equal(searchForm[0]?.title, "Login Flow");

    const searchTag = await service.list("proj-1", { query: "auth" });
    assert.equal(searchTag.length, 1);
    assert.equal(searchTag[0]?.title, "Login Flow");
  });

  test("removes a reference by id", async () => {
    const ref = await service.add("proj-1", {
      urlOrPath: "https://example.com/delete-me.png",
      title: "To Delete",
    });

    const removed = await service.remove("proj-1", ref.id);
    assert.equal(removed, true);

    const listAfter = await service.list("proj-1");
    assert.equal(listAfter.length, 0);

    const removeAgain = await service.remove("proj-1", ref.id);
    assert.equal(removeAgain, false);
  });

  test("collects unique tags with counts for project and globally", async () => {
    await service.add("proj-1", {
      urlOrPath: "https://example.com/1.png",
      tags: ["ui", "dark"],
    });
    await service.add("proj-1", {
      urlOrPath: "https://example.com/2.png",
      tags: ["ui", "light"],
    });
    await service.add("proj-2", {
      urlOrPath: "https://example.com/3.png",
      tags: ["ui", "mobile"],
    });

    const tagsProj1 = await service.listTags("proj-1");
    assert.deepEqual(tagsProj1, [
      { name: "ui", count: 2 },
      { name: "dark", count: 1 },
      { name: "light", count: 1 },
    ]);

    const globalTags = await service.listTags(null);
    assert.deepEqual(globalTags, [
      { name: "ui", count: 3 },
      { name: "dark", count: 1 },
      { name: "light", count: 1 },
      { name: "mobile", count: 1 },
    ]);
  });

  test("persists references across storage instances", async () => {
    await service.add("proj-persist", {
      urlOrPath: "https://example.com/persisted.png",
      title: "Durable Reference",
      tags: ["durable"],
    });

    const newStorage = new FileReferenceStorage(tempDir);
    const newService = new ReferenceService(newStorage);

    const loaded = await newService.list("proj-persist");
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.title, "Durable Reference");
  });
});
