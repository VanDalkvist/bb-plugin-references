import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ReferenceService } from "../src/services/reference-service.ts";
import { FileReferenceStorage } from "../src/storage/reference-storage.ts";
import { handleCliCommand } from "../src/cli/commands.ts";

describe("CLI Commands (TDD)", () => {
  let tempDir: string;
  let service: ReferenceService;
  let publishedEvents: Array<{ channel: string; payload: unknown }>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bb-refs-cli-"));
    const storage = new FileReferenceStorage(tempDir);
    service = new ReferenceService(storage);
    publishedEvents = [];
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const publisher = (channel: string, payload: unknown) => {
    publishedEvents.push({ channel, payload });
  };

  test("handles 'list' when empty", async () => {
    const res = await handleCliCommand(["list"], service, publisher, "proj-test");
    assert.equal(res.exitCode, 0);
    assert.ok(res.stdout?.includes("No references found"));
  });

  test("adds a reference via CLI", async () => {
    const res = await handleCliCommand(
      ["add", "https://example.com/mock.png", "--title", "Mock Title", "--tags", "ui,mobile"],
      service,
      publisher,
      "proj-test"
    );

    assert.equal(res.exitCode, 0);
    assert.ok(res.stdout?.includes("Added reference: Mock Title"));

    const list = await service.list("proj-test");
    assert.equal(list.length, 1);
    assert.equal(list[0]?.title, "Mock Title");
    assert.deepEqual(list[0]?.tags, ["ui", "mobile"]);
  });

  test("triggers realtime open event when --open flag is passed (Killer Feature)", async () => {
    const res = await handleCliCommand(
      ["add", "https://example.com/moodboard.png", "--title", "Moodboard", "--open"],
      service,
      publisher,
      "proj-test"
    );

    assert.equal(res.exitCode, 0);

    const openEvent = publishedEvents.find((e) => e.channel === "references-open");
    assert.ok(openEvent, "Should publish references-open event");
    assert.equal((openEvent.payload as any).projectId, "proj-test");

    const changedEvent = publishedEvents.find((e) => e.channel === "references-changed");
    assert.ok(changedEvent, "Should publish references-changed event");
  });

  test("removes a reference via CLI", async () => {
    const ref = await service.add("proj-test", {
      urlOrPath: "https://example.com/test.png",
      title: "Item to remove",
    });

    const res = await handleCliCommand(["remove", ref.id], service, publisher, "proj-test");
    assert.equal(res.exitCode, 0);
    assert.ok(res.stdout?.includes(`Removed reference ${ref.id}`));

    const remaining = await service.list("proj-test");
    assert.equal(remaining.length, 0);
  });

  test("returns json output with --json flag", async () => {
    await service.add("proj-test", {
      urlOrPath: "https://example.com/json-item.png",
      title: "JSON Item",
    });

    const res = await handleCliCommand(["list", "--json"], service, publisher, "proj-test");
    assert.equal(res.exitCode, 0);
    const parsed = JSON.parse(res.stdout || "[]");
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].title, "JSON Item");
  });

  test("handles 'open' command directly", async () => {
    const res = await handleCliCommand(["open", "--id", "ref-123"], service, publisher, "proj-test");
    assert.equal(res.exitCode, 0);

    const openEvent = publishedEvents.find((e) => e.channel === "references-open");
    assert.ok(openEvent);
    assert.equal((openEvent.payload as any).referenceId, "ref-123");
  });

  test("shows help with --help", async () => {
    const res = await handleCliCommand(["--help"], service, publisher, "proj-test");
    assert.equal(res.exitCode, 0);
    assert.ok(res.stdout?.includes("Usage:"));
    assert.ok(res.stdout?.includes("bb references"));
  });
});
