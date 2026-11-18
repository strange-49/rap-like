import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './providers'
import { AppRoutes } from '../routes'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ErrorBoundary>
    </AppProviders>
  )
}
