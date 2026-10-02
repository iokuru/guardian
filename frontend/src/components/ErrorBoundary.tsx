import { Component, type ErrorInfo, type ReactNode } from "react";
import { ShieldAlert, RefreshCw, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Guardian uncaught UI exception:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">
              <ShieldAlert size={28} />
            </div>
            <div className="error-boundary-body">
              <h2 className="error-boundary-title">Application Exception Encountered</h2>
              <p className="error-boundary-desc">
                A component runtime error occurred. An error boundary intercepted the failure to
                prevent the application from crashing.
              </p>
              {this.state.error && (
                <div className="error-boundary-detail">
                  <code>{this.state.error.message || String(this.state.error)}</code>
                </div>
              )}
              <div className="error-boundary-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={this.handleReset}
                >
                  <RotateCcw size={14} />
                  <span>Try again</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw size={14} />
                  <span>Reload application</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback(): ReactNode | undefined {
    return this.props.fallback;
  }
}
