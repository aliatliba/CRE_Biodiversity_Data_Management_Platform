import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DesignationTiles } from './DesignationTiles'
import { makeDesignations } from './testData'

describe('DesignationTiles (site card row)', () => {
  it('renders nothing without designations', () => {
    const { container } = render(<DesignationTiles designations={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows one logo per designation, named by its alt text', () => {
    render(<DesignationTiles designations={makeDesignations(3)} />)
    const logos = screen.getAllByRole('img')
    expect(logos).toHaveLength(3)
    expect(logos[0]).toHaveAttribute('alt', 'Designation 0')
    expect(logos[0]).toHaveAttribute('loading', 'lazy')
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('caps the row at 5 logos plus a "+N" tile listing the rest', () => {
    render(<DesignationTiles designations={makeDesignations(7)} />)
    expect(screen.getAllByRole('img')).toHaveLength(5)
    const more = screen.getByText('+2')
    expect(more.closest('li')).toHaveAttribute('aria-label', '2 more: Designation 5, Designation 6')
  })

  it('opens the site\'s own page for a designation, else its official website', () => {
    const [own, official, none] = makeDesignations(3)
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(
      <DesignationTiles
        designations={[
          { ...own, url: 'https://rsis.ramsar.org/ris/1056', official_url: 'https://www.ramsar.org/' },
          { ...official, official_url: 'https://www.unesco.org/en/mab' },
          none,
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Designation 0: open website' }))
    expect(open).toHaveBeenLastCalledWith('https://rsis.ramsar.org/ris/1056', '_blank', 'noopener,noreferrer')
    fireEvent.click(screen.getByRole('button', { name: 'Designation 1: open website' }))
    expect(open).toHaveBeenLastCalledWith('https://www.unesco.org/en/mab', '_blank', 'noopener,noreferrer')
    // No link at all: just a logo.
    expect(screen.queryByRole('button', { name: 'Designation 2: open website' })).not.toBeInTheDocument()
    open.mockRestore()
  })
})
