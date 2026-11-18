import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { error: Error | null }

/**
 * Catches render errors anywhere below it. Without a boundary a single
 * exception in one component unmounts the whole app and leaves a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('UrbanRide UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          maxWidth: 520,
          margin: '12vh auto',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: '#555', marginBottom: 16 }}>
          This page hit an unexpected error. Your data is safe. Reload to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: '10px 18px', borderRadius: 8, border: 0, cursor: 'pointer' }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
