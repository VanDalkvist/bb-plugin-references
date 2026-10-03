import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handleImageRequest, isPathAllowed } from "../src/server/image-handler.ts";

describe("ImageHandler (AP-016 & AP-043 Security)", () => {
  let allowedRoot: string;
  let outsideDir: string;

  beforeEach(async () => {
    allowedRoot = await mkdtemp(join(tmpdir(), "bb-refs-img-allowed-"));
    outsideDir = await mkdtemp(join(tmpdir(), "bb-refs-img-outside-"));
  });

  afterEach(async () => {
    await rm(allowedRoot, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  });

  test("allows paths inside allowed roots and rejects paths outside", () => {
    const inside = join(allowedRoot, "test.png");
    const outside = join(outsideDir, "secret.png");

    assert.equal(isPathAllowed(inside, [allowedRoot]), true);
    assert.equal(isPathAllowed(outside, [allowedRoot]), false);
  });

  test("serves valid image with correct content type and headers", async () => {
    const imgPath = join(allowedRoot, "photo.jpg");
    // Write fake jpeg header
    await writeFile(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const response = await handleImageRequest(imgPath, [allowedRoot]);
    assert.equal(response.status, 200);
    assert.equal(response.headers["Content-Type"], "image/jpeg");
    assert.equal(response.headers["X-Content-Type-Options"], "nosniff");
    assert.ok(Buffer.isBuffer(response.body));
  });

  test("blocks path traversal attempt (AP-016)", async () => {
    const maliciousPath = join(allowedRoot, "../../../etc/passwd");
    const response = await handleImageRequest(maliciousPath, [allowedRoot]);

    assert.equal(response.status, 403);
    assert.ok(response.body.toString().includes("Forbidden"));
  });

  test("returns 404 for non-existent image", async () => {
    const missingPath = join(allowedRoot, "does-not-exist.png");
    const response = await handleImageRequest(missingPath, [allowedRoot]);

    assert.equal(response.status, 404);
  });

  test("rejects non-image files for security", async () => {
    const scriptPath = join(allowedRoot, "malicious.js");
    await writeFile(scriptPath, 'console.log("evil")');

    const response = await handleImageRequest(scriptPath, [allowedRoot]);
    assert.equal(response.status, 403);
    assert.ok(response.body.toString().includes("Unsupported or disallowed file type"));
  });
});
