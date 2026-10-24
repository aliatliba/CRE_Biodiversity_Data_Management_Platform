import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeciesPage } from './SpeciesPage'

const listSpecies = vi.fn()

vi.mock('../services/speciesService', () => ({
  listSpecies: (params: unknown) => listSpecies(params),
}))
vi.mock('@/features/sites/services/siteService', () => ({
  listSites: () => Promise.resolve([{ id: 3, name: 'Chréa', code: null, description: null }]),
}))

function renderPage(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <SpeciesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SpeciesPage URL filters', () => {
  beforeEach(() => {
    listSpecies.mockReset()
    listSpecies.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 15, pages: 1 })
  })

  it('turns URL params into the list query', async () => {
    renderPage('/species?site_id=3&iucn_status=CR,EN,VU&national_status=Protected')

    await waitFor(() => expect(listSpecies).toHaveBeenCalled())
    expect(listSpecies).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: 3,
        iucn_status: 'CR,EN,VU',
        national_status: 'Protected',
        page: 1,
      }),
    )
  })

  it('sends no filters when the URL has none', async () => {
    renderPage('/species')

    await waitFor(() => expect(listSpecies).toHaveBeenCalled())
    const params = listSpecies.mock.calls[0][0]
    expect(params.site_id).toBeUndefined()
    expect(params.iucn_status).toBeUndefined()
  })
})
