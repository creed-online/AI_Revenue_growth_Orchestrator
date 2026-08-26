import { Component } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel rounded-2xl border border-rose-signal/30 bg-rose-signal/10 p-8 text-center"
        >
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-rose-signal" />
          <h3 className="font-display text-lg font-bold text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-ink-muted mb-4 max-w-md mx-auto">
            The 3D visualization failed to load. This can happen due to browser
            graphics driver issues or WebGL restrictions.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-6 text-left text-xs">
              <summary className="text-rose-signal cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 p-3 rounded bg-ink border border-ink-border overflow-auto max-h-40">
                {this.state.error?.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;