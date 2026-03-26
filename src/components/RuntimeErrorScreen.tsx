import { Component, type ErrorInfo, type ReactNode } from 'react';

type FatalProps = {
  title: string;
  details: string;
};

export function RuntimeErrorScreen({ title, details }: FatalProps) {
  return (
    <div className="fatal-screen">
      <div className="fatal-card">
        <h1>{title}</h1>
        <p>The app hit an unexpected error. Use the details below to diagnose quickly.</p>
        <pre>{details}</pre>
        <div className="actions-row">
          <button onClick={() => window.location.reload()}>Reload App</button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(details);
              } catch {
                console.error('Failed to copy error details to clipboard');
              }
            }}
          >
            Copy Error
          </button>
        </div>
      </div>
    </div>
  );
}

type BoundaryProps = {
  children: ReactNode;
};

type BoundaryState = {
  hasError: boolean;
  details: string;
};

export class RuntimeErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false, details: '' };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      details: error?.stack || String(error)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RuntimeErrorBoundary]', error, errorInfo);
    this.setState({
      hasError: true,
      details: `${error?.stack || String(error)}\n\n${errorInfo.componentStack || ''}`
    });
  }

  render() {
    if (this.state.hasError) {
      return <RuntimeErrorScreen title="Application Error" details={this.state.details} />;
    }
    return this.props.children;
  }
}
