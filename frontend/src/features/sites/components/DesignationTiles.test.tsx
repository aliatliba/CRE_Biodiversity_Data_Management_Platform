import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
