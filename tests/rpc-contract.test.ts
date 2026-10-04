import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { rpcContract } from "../src/rpc/contract.ts";
import { createRpcHandlers } from "../src/rpc/handlers.ts";
import { ReferenceService } from "../src/services/reference-service.ts";

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

    const withNull = rpcContract.references_list.input.safeParse(null);
    assert.equal(withNull.success, true);

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

  test("references_toggle_pin schema requires id and accepts optional projectId", () => {
    const valid = rpcContract.references_toggle_pin.input.safeParse({
      projectId: "proj-123",
      id: "ref-789",
    });
    assert.equal(valid.success, true);

    const missingId = rpcContract.references_toggle_pin.input.safeParse({
      projectId: "proj-123",
    });
    assert.equal(missingId.success, false);
  });

  test("createRpcHandlers wires handlers correctly to ReferenceService", async () => {
    let published: Array<{ channel: string; payload: unknown }> = [];
    const mockStorage = {
      async getReferences() {
        return [];
      },
      async saveReferences() {},
      async listProjectIds() {
        return [];
      },
      async getAllReferences() {
        return [];
      },
    };
    const mockBb = {
      realtime: {
        publish(channel: string, payload: unknown) {
          published.push({ channel, payload });
        },
      },
    };

    const service = new ReferenceService(mockStorage as any);
    const handlers = createRpcHandlers(service, mockBb as any);

    const listRes = await handlers.references_list({ projectId: "test" });
    assert.deepEqual(listRes, { references: [] });

    const openRes = await handlers.references_open({ projectId: "test", referenceId: "ref-1" });
    assert.deepEqual(openRes, { ok: true });
    assert.equal(published.length, 1);
    assert.equal(published[0]?.channel, "references-open");
  });
});
