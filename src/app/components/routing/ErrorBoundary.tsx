import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // In production, log to institutional observability or console
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header with Institutional Branding */}
            <div className="bg-[#002147] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm tracking-wider">
                  IQAC
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-tight">CHRIST (Deemed to be University)</h2>
                  <p className="text-xs text-blue-200">Internal Quality Assurance Cell</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs rounded bg-red-500/20 text-red-200 font-medium">
                Application Notice
              </span>
            </div>

            {/* Content Body */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  !
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">
                    A module error interrupted page rendering
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    The requested view encountered an unexpected issue while loading data or rendering components. Your current session remains secure.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-[#002147] hover:bg-[#001833] text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Reload Application
                </button>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Return to Homepage
                </button>
              </div>

              {/* Technical Details Toggle */}
              {this.state.error && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {this.state.showDetails ? '▼ Hide diagnostic details' : '▶ Show diagnostic details'}
                  </button>

                  {this.state.showDetails && (
                    <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                      <p className="font-semibold text-red-400">{this.state.error.toString()}</p>
                      {this.state.errorInfo?.componentStack && (
                        <p className="mt-2 text-slate-400 text-[11px]">{this.state.errorInfo.componentStack}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
