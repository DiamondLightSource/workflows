import React, { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WorkflowsErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("WorkflowsErrorBoundary caught an error", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <h3>{this.state.error?.message}</h3>;
    }

    return this.props.children;
  }
}

export default WorkflowsErrorBoundary;
