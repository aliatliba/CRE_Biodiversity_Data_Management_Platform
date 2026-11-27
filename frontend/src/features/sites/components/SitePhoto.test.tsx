import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SitePhotoBanner } from './SitePhotoBanner'
import { SitePhotoPicker } from './SitePhotoPicker'

const getSitePhoto = vi.fn(() => Promise.resolve(new Blob(['x'], { type: 'image/webp' })))
vi.mock('../services/siteService', () => ({
  getSitePhoto: (...args: unknown[]) => getSitePhoto(...(args as [])),
}))

const resized = new Blob(['small'], { type: 'image/webp' })
vi.mock('../lib/preparePhoto', () => ({
  PHOTO_ACCEPT: 'image/jpeg,image/png,image/webp',
  preparePhoto: vi.fn(() => Promise.resolve({ blob: resized, width: 1920, height: 1080 })),
}))

function withQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const noPhoto = { id: 1, name: 'Tonga', photo_updated_at: null }
const withPhoto = { id: 1, name: 'Tonga', photo_updated_at: '2026-11-27T10:00:00Z' }

beforeEach(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:photo')
  URL.revokeObjectURL = vi.fn()
  getSitePhoto.mockClear()
})
afterEach(() => vi.clearAllMocks())

describe('SitePhotoBanner', () => {
  it('renders nothing without a photo unless a placeholder is wanted', () => {
    const { container } = withQuery(<SitePhotoBanner site={noPhoto} />)
    expect(container).toBeEmptyDOMElement()
    expect(getSitePhoto).not.toHaveBeenCalled()
  })

  it('shows a placeholder, not an image, when asked for one', () => {
    const { container } = withQuery(<SitePhotoBanner site={noPhoto} placeholder />)
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('loads the photo version given by the site', async () => {
    withQuery(<SitePhotoBanner site={withPhoto} />)
    const img = await screen.findByRole('img', { name: 'Landscape at Tonga' })
    expect(img).toHaveAttribute('src', 'blob:photo')
    expect(getSitePhoto).toHaveBeenCalledWith(1, '2026-11-27T10:00:00Z')
  })
})

describe('SitePhotoPicker', () => {
  it('turns a chosen file into a "set" change with the resized photo', async () => {
    const onChange = vi.fn()
    withQuery(<SitePhotoPicker change={{ kind: 'keep' }} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /choose a photo/i })).toBeInTheDocument()

    const file = new File(['big'], 'lake.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('Landscape photo file'), file)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ kind: 'set', photo: resized }))
  })

  it('offers to change or remove the current photo, and to undo the removal', async () => {
    const onChange = vi.fn()
    const { rerender } = withQuery(
      <SitePhotoPicker site={withPhoto} change={{ kind: 'keep' }} onChange={onChange} />,
    )
    expect(await screen.findByRole('img')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'remove' })

    const client = new QueryClient()
    rerender(
      <QueryClientProvider client={client}>
        <SitePhotoPicker site={withPhoto} change={{ kind: 'remove' }} onChange={onChange} />
      </QueryClientProvider>,
    )
    expect(screen.getByText(/will be removed when you save/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'keep' })
  })

  it('discards a newly chosen photo without asking to delete anything', async () => {
    const onChange = vi.fn()
    withQuery(<SitePhotoPicker change={{ kind: 'set', photo: resized }} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'keep' })
  })
})
