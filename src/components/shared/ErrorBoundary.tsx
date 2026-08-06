import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackClassName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, componentStack: "" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    const stack = errorInfo.componentStack || "";
    this.setState({ componentStack: stack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: "" });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <Card className={this.props.fallbackClassName}>
          <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive/70 mb-3" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-foreground">Something went wrong</h3>
            {this.state.error && (
              <p className={cn("mt-1 max-w-md text-xs font-mono break-all", isDev ? "text-destructive" : "text-muted-foreground")}>
                {this.state.error.message || "No error message"}
              </p>
            )}
            {this.state.componentStack && (
              <pre className="mt-2 max-w-md overflow-x-auto text-left text-[10px] leading-tight text-muted-foreground font-mono whitespace-pre-wrap break-all">
                {this.state.componentStack.slice(0, 1200)}
              </pre>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              An unexpected error occurred in this section.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" variant="default" onClick={this.handleReset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Try Again
              </Button>
              <Button size="sm" variant="ghost" onClick={this.handleReload}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
