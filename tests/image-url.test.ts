import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveImageUrl, isWebUrl } from "../src/utils/image-url.ts";

describe("Image URL Resolver", () => {
  test("preserves web URLs", () => {
    assert.equal(isWebUrl("https://images.unsplash.com/photo-123"), true);
    assert.equal(isWebUrl("http://example.com/test.png"), true);
    assert.equal(isWebUrl("data:image/png;base64,..."), true);
    assert.equal(isWebUrl("/workspace/test.png"), false);
    assert.equal(isWebUrl("docs/references/hero.png"), false);

    assert.equal(
      resolveImageUrl("https://images.unsplash.com/photo-123"),
      "https://images.unsplash.com/photo-123"
    );
  });

  test("transforms local file paths to plugin HTTP endpoint", () => {
    const local = "/workspace/docs/hero.png";
    const resolved = resolveImageUrl(local);
    assert.ok(resolved.startsWith("/api/v1/plugins/references/http/image?path="));
    assert.ok(resolved.includes(encodeURIComponent(local)));
  });
});
