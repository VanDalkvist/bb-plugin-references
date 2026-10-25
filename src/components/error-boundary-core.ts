export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export function createInitialErrorBoundaryState(): ErrorBoundaryState {
  return {
    hasError: false,
    error: null,
  };
}

export function createErrorState(error: unknown): ErrorBoundaryState {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  return {
    hasError: true,
    error: normalizedError,
  };
}

export function formatRenderErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Unknown rendering exception";
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected UI error occurred";
}
