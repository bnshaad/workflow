import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
              type="button"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              type="button"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
