import * as React from 'react';
import { Button } from './Button';

type Props = {
  children: React.ReactNode;
  fallbackTitle: string;
  fallbackDesc?: string;
  onReset?: () => void;
};

type State = {
  error: Error | null;
  retryCount: number;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = (): void => {
    this.props.onReset?.();
    this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }));
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          key={this.state.retryCount}
          className="w-full h-full flex items-center justify-center p-6"
        >
          <div
            role="alert"
            className="border border-[--line] rounded-lg bg-[--panel] p-6 max-w-md w-full text-center space-y-4"
          >
            <div className="flex justify-center">
              <div
                className="w-12 h-12 rounded-full border-2 border-orange-400/40 bg-orange-400/10 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-orange-400"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-mono uppercase tracking-wider text-sm text-[--text]">
                {this.props.fallbackTitle}
              </h3>
              {this.props.fallbackDesc && (
                <p className="text-sm text-[--dim]">{this.props.fallbackDesc}</p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleRetry}
              aria-label={`Retry: ${this.props.fallbackTitle}`}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.retryCount}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
