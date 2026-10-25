import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialErrorBoundaryState,
  createErrorState,
  formatRenderErrorMessage,
} from "../src/components/error-boundary-core.ts";

describe("ErrorBoundary Core (TDD)", () => {
  test("initializes with hasError: false and error: null", () => {
    const state = createInitialErrorBoundaryState();
    assert.equal(state.hasError, false);
    assert.equal(state.error, null);
  });

  test("captures error in createErrorState from Error instance", () => {
    const err = new Error("Skia compositor failed");
    const nextState = createErrorState(err);
    assert.equal(nextState.hasError, true);
    assert.equal(nextState.error?.message, "Skia compositor failed");
  });

  test("captures error in createErrorState from string or unknown", () => {
    const nextState = createErrorState("Fatal canvas overflow");
    assert.equal(nextState.hasError, true);
    assert.equal(nextState.error?.message, "Fatal canvas overflow");
  });

  test("formatRenderErrorMessage handles Error, string, and unknown objects", () => {
    assert.equal(formatRenderErrorMessage(new Error("GPU crash")), "GPU crash");
    assert.equal(formatRenderErrorMessage("Direct string error"), "Direct string error");
    assert.equal(formatRenderErrorMessage(null), "An unexpected UI error occurred");
    assert.equal(formatRenderErrorMessage(undefined), "An unexpected UI error occurred");
  });
});
