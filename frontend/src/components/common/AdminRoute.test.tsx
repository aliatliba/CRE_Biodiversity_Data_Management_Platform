import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoute } from './AdminRoute'

const useAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuth() }))

function renderAt(role: string | undefined) {
  useAuth.mockReturnValue({ user: role ? { role } : null })
  return render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route path="/dashboard" element={<p>dashboard</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<p>users page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRoute', () => {
  it('renders the page for admins', () => {
    renderAt('admin')
    expect(screen.getByText('users page')).toBeInTheDocument()
  })

  it('redirects researchers to the dashboard', () => {
    renderAt('researcher')
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.queryByText('users page')).not.toBeInTheDocument()
  })
})
