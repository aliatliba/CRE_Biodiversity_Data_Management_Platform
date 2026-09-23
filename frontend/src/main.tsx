import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import './index.css'

const initialSplash = document.getElementById('initial-splash')

if (initialSplash) {
  // Keep the splash visible for ~2.6s, then fade it out.
  // Image loading must never block the exit animation.
  window.setTimeout(() => {
    initialSplash.classList.add('initial-splash-exit')

    // Remove it after the CSS fade-out finishes.
    window.setTimeout(() => {
      initialSplash.remove()
    }, 1600)
  }, 2600)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)