import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileReferenceStorage } from "../src/storage/reference-storage.ts";
import { ReferenceService } from "../src/services/reference-service.ts";
import { handleCliCommand } from "../src/cli/commands.ts";
import { handleImageRequest } from "../src/server/image-handler.ts";
import { resolveImageUrl } from "../src/utils/image-url.ts";

describe("E2E Reference Moodboard Integration", () => {
  let tempDir: string;
  let workspaceDir: string;
  let service: ReferenceService;
  let publishedEvents: Array<{ channel: string; payload: any }>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bb-refs-e2e-storage-"));
    workspaceDir = await mkdtemp(join(tmpdir(), "bb-refs-e2e-workspace-"));
    const storage = new FileReferenceStorage(tempDir);
    service = new ReferenceService(storage);
    publishedEvents = [];
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await rm(workspaceDir, { recursive: true, force: true });
  });

  const publisher = (channel: string, payload: unknown) => {
    publishedEvents.push({ channel, payload });
  };

  test("full agent workflow: add local reference with --open, serve image, query tags", async () => {
    // 1. Create a local reference image in workspace
    const localImgPath = join(workspaceDir, "dark-nav-bar.png");
    await writeFile(localImgPath, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG magic bytes

    // 2. Agent runs: bb references add <path> --title "Dark Nav" --tags "ui,navigation,dark" --open
    const cliRes = await handleCliCommand(
      [
        "add",
        localImgPath,
        "--title",
        "Dark Navigation Bar",
        "--tags",
        "ui,navigation,dark",
        "--notes",
        "Clean 12px pill styling with subtle elevation",
        "--open",
      ],
      service,
      publisher,
      "project-alpha"
    );

    assert.equal(cliRes.exitCode, 0);

    // 3. Verify Killer Feature: realtime open signal published immediately
    const openEvent = publishedEvents.find((e) => e.channel === "references-open");
    assert.ok(openEvent, "Should emit references-open realtime event");
    assert.equal(openEvent.payload.projectId, "project-alpha");
    assert.ok(openEvent.payload.referenceId);

    // 4. Verify reference is listed with correct metadata
    const list = await service.list("project-alpha");
    assert.equal(list.length, 1);
    const ref = list[0]!;
    assert.equal(ref.title, "Dark Navigation Bar");
    assert.equal(ref.urlOrPath, localImgPath);
    assert.deepEqual(ref.tags, ["ui", "navigation", "dark"]);

    // 5. Verify image URL resolution
    const resolvedUrl = resolveImageUrl(ref.urlOrPath);
    assert.ok(resolvedUrl.startsWith("/api/v1/plugins/references/http/image?path="));

    // 6. Verify image server handles the request safely
    const imgResponse = await handleImageRequest(ref.urlOrPath, [workspaceDir, tempDir]);
    assert.equal(imgResponse.status, 200);
    assert.equal(imgResponse.headers["Content-Type"], "image/png");

    // 7. Verify tags query
    const tags = await service.listTags("project-alpha");
    assert.equal(tags.length, 3);
    assert.ok(tags.some((t) => t.name === "ui" && t.count === 1));
  });
});
