import { Typography } from "@mui/material";
import React, { Component, ReactNode } from "react";
import { formatErrorMessage } from "workflows-lib/lib/utils/commonUtils";

interface ErrorBoundaryProps {
  children: (props: { fetchKey: number }) => ReactNode;
  fallback?:
    | ReactNode
    | ((props: { error: Error; retry: () => void }) => ReactNode);
  maxRetries?: 0 | 1 | 2;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  fetchKey: number;
  retryCount: number;
  isUnauthorized: boolean;
}

class WorkflowErrorBoundaryWithRetry extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      fetchKey: 0,
      retryCount: 0,
      isUnauthorized: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "WorkflowsError caught by boundary during Query fetching:",
      error,
      errorInfo,
    );

    if (error.message.includes("Unauthorized")) {
      this.setState((prev) => ({
        ...prev,
        isUnauthorized: true,
      }));
    }

    const maxRetries = this.props.maxRetries ?? 2;

    if (!this.state.isUnauthorized && this.state.retryCount < maxRetries) {
      this.retryTimeoutId = setTimeout(
        () => {
          this._retry();
        },
        1000 * (this.state.retryCount + 1),
      );
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  _retry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      fetchKey: prev.fetchKey + 1,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    const { children, fallback, maxRetries = 2 } = this.props;
    const { hasError, error, fetchKey, retryCount, isUnauthorized } =
      this.state;

    if (hasError && error) {
      if (isUnauthorized || retryCount >= maxRetries) {
        if (typeof fallback === "function") {
          return fallback({ error, retry: this._retry });
        }
        return (
          fallback || (
            <Typography variant="h6" fontWeight="bold">
              {formatErrorMessage(error.message)}
            </Typography>
          )
        );
      }

      return (
        <Typography variant="h6" fontWeight="bold">
          Trying to Refetch Data...
        </Typography>
      );
    }

    return children({ fetchKey });
  }
}

export default WorkflowErrorBoundaryWithRetry;
