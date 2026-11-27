import { Alert, AlertTitle } from "@mui/material";
import React, { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | undefined;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("Caught an error: ", error, info);
  }

  render(): ReactNode {
    const { fallback, children } = this.props;
    const { error } = this.state;

    return error ? (
      fallback ? (
        fallback(error)
      ) : (
        <Alert severity="error">
          <AlertTitle>{error.name}</AlertTitle>
          {error.message}
        </Alert>
      )
    ) : (
      children
    );
  }
}

export default ErrorBoundary;
