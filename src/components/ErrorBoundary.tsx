import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { Icon } from "../../components/ui/icon.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  createInitialErrorBoundaryState,
  createErrorState,
  formatRenderErrorMessage,
  type ErrorBoundaryState,
} from "./error-boundary-core.ts";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = createInitialErrorBoundaryState();

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return createErrorState(error);
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[bb-plugin-references ErrorBoundary] Caught render error:", error, errorInfo);
  }

  public handleReset = (): void => {
    this.setState(createInitialErrorBoundaryState());
    this.props.onReset?.();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = formatRenderErrorMessage(this.state.error);

      return (
        <div className="flex h-full w-full min-h-[240px] flex-col items-center justify-center p-6 text-center bg-background text-foreground">
          <div className="max-w-md w-full bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <Icon name="AlertCircle" className="size-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {this.props.fallbackTitle || "References panel encountered an error"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {this.props.fallbackDescription ||
                  "A rendering error occurred in the references view. Try reloading."}
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-md bg-secondary/60 p-2.5 text-left text-[11px] font-mono text-destructive border border-border/70 break-words select-text">
                {errorMessage}
              </div>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={this.handleReset}
              className="w-full gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Icon name="RotateCcw" className="size-3.5" />
              <span>Reload References</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
