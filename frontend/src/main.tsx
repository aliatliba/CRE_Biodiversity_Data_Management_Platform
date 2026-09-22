import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import './index.css'

const initialSplash = document.getElementById('initial-splash')

if (initialSplash) {
  window.setTimeout(() => {
    initialSplash.classList.add('initial-splash-exit')

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
  </StrictMode>
)
