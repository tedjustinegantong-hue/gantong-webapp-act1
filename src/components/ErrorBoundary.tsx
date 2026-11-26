import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let displayMessage = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        displayMessage = `Database ${parsed.operationType || 'operation'} failed on ${parsed.path || 'record'}: ${parsed.error}`;
      }
    } catch {
      // Standard error message
    }
    return { hasError: true, errorMessage: displayMessage };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#141413] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-[#9B2226] mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141413] text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
