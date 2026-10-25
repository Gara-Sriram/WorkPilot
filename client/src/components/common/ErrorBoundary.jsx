import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[WorkPilot ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-xl border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Unexpected Interface Exception
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            WorkPilot recovered gracefully from a UI rendering error without crashing the server or losing background task state.
          </p>

          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono text-rose-700 overflow-x-auto max-h-40">
            {this.state.error?.toString()}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry View</span>
            </button>
            <button
              onClick={() => {
                this.handleReset();
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Overview</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
