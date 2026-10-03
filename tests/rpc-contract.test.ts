import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { rpcContract } from "../src/rpc/contract.ts";

describe("RPC Contract (AP-026 DTO Boundaries)", () => {
  test("references_list schema validates correct inputs and rejects invalid", () => {
    const valid = rpcContract.references_list.input.safeParse({
      projectId: "my-project",
      tag: "ui",
      query: "dashboard",
    });
    assert.equal(valid.success, true);

    const empty = rpcContract.references_list.input.safeParse({});
    assert.equal(empty.success, true);

    const invalid = rpcContract.references_list.input.safeParse({
      projectId: 12345, // should be string
    });
    assert.equal(invalid.success, false);
  });

  test("references_add schema requires urlOrPath and accepts optional fields", () => {
    const valid = rpcContract.references_add.input.safeParse({
      urlOrPath: "https://example.com/image.png",
      title: "Sample Ref",
      tags: ["tag1", "tag2"],
      open: true,
    });
    assert.equal(valid.success, true);

    const missingUrl = rpcContract.references_add.input.safeParse({
      title: "No url",
    });
    assert.equal(missingUrl.success, false);
  });

  test("references_open schema accepts target parameters", () => {
    const valid = rpcContract.references_open.input.safeParse({
      projectId: "proj-123",
      threadId: "thr-abc",
      referenceId: "ref-456",
    });
    assert.equal(valid.success, true);
  });
});
