import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from './hooks/useTheme.tsx'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import './index.css'

const initialSplash = document.getElementById('initial-splash')

if (initialSplash) {
  window.setTimeout(() => {
    initialSplash.classList.add('initial-splash-exit')

    window.setTimeout(() => {
      initialSplash.remove()
    }, 1600)
  }, 6800)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Honour the OS "reduce motion" setting for every framer-motion animation. */}
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
