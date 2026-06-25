import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // [SECURITY] Log error details ONLY to console/monitoring — never display to user.
    // error.message can expose internal file paths, function names, and stack traces.
    console.error('[NextVWT ErrorBoundary]', error, info);
    // TODO: Send to Sentry or internal monitoring in production:
    // Sentry.captureException(error, { extra: info });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '24px',
            background: '#1a1c23',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            Terjadi Kesalahan
          </h2>
          <p
            style={{
              color: '#9ca3af',
              fontSize: '14px',
              marginBottom: '24px',
              maxWidth: '300px',
              textAlign: 'center',
            }}
          >
            {/* [SECURITY] DO NOT display error.message here — it can leak internal
                file paths, function names, or library details to end users.
                Internal details are logged via componentDidCatch above. */}
            Terjadi gangguan tak terduga pada aplikasi. Silakan coba lagi atau restart aplikasi.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '12px 32px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
