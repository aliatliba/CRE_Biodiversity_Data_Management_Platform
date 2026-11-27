import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Site } from '../types'
import { makeDesignations } from './testData'
import { SiteDesignationsSection } from './SiteDesignationsSection'

vi.mock('../services/siteService', () => ({
  listDesignations: () => Promise.resolve(makeDesignations(5)),
  addSiteDesignation: vi.fn(),
  removeSiteDesignation: vi.fn(),
  setSiteDesignationUrl: vi.fn(),
}))

function site(count: number): Site {
  return { id: 1, name: 'Tonga', code: null, description: null, created_by: null, designations: makeDesignations(count), photo_updated_at: null }
}

function renderSection(count: number, isAdmin: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SiteDesignationsSection site={site(count)} isAdmin={isAdmin} />
    </QueryClientProvider>,
  )
}

describe('SiteDesignationsSection (site page)', () => {
  it('is read-only for non-admins', () => {
    renderSection(2, false)
    expect(screen.getByText('Designations & labels')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /add designation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /website link/i })).not.toBeInTheDocument()
  })

  it('is hidden for non-admins when the site has no designation', () => {
    const { container } = renderSection(0, false)
    expect(container).toBeEmptyDOMElement()
  })

  it('lets admins add and remove designations', () => {
    renderSection(2, true)
    expect(screen.getByRole('button', { name: /add designation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Designation 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Designation 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add website link for Designation 0' })).toBeInTheDocument()
  })

  it('shows admins an empty state with an add button', () => {
    renderSection(0, true)
    expect(screen.getByText('No designation for this site yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add designation/i })).toBeInTheDocument()
  })
})
