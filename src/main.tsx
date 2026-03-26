import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RuntimeErrorBoundary, RuntimeErrorScreen } from './components/RuntimeErrorScreen.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

const root = createRoot(rootElement)

function renderApp() {
  root.render(
    <StrictMode>
      <RuntimeErrorBoundary>
        <App />
      </RuntimeErrorBoundary>
    </StrictMode>,
  )
}

renderApp()

window.addEventListener('error', (event) => {
  const details = event.error?.stack || event.message || 'Unknown renderer error'
  console.error('[window.error]', details)
  root.render(<RuntimeErrorScreen title="Renderer Runtime Error" details={details} />)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const details = reason?.stack || String(reason)
  console.error('[window.unhandledrejection]', details)
  root.render(<RuntimeErrorScreen title="Unhandled Promise Rejection" details={details} />)
})
