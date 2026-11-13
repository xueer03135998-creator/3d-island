import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** 全局错误边界：类组件是 React 里唯一允许使用 class 的场景 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    window.dispatchEvent(
      new ErrorEvent('error', {
        error,
        message: error.message || String(error),
        filename: location.href,
      })
    );
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <div className="animate-in fade-in mx-auto mt-[15vh] max-w-md rounded-md bg-surface p-8 text-center duration-300">
          <TriangleAlert size={40} className="mx-auto mb-3 text-danger" aria-hidden="true" />
          <h2 className="mb-3 text-xl font-semibold">页面出错了</h2>
          <p className="mb-3 text-content-weak">{error.message}</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw size={16} aria-hidden="true" />
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
