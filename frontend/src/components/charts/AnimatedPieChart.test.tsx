import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnimatedPieChart } from './AnimatedPieChart'

describe('AnimatedPieChart', () => {
  it('leaves 0% categories out of the legend', () => {
    render(
      <AnimatedPieChart
        showValues
        data={[
          { label: 'Fauna', value: 3 },
          { label: 'Flora', value: 1 },
          { label: 'Fungi', value: 0 },
          { label: 'Micro-organisms', value: 0 },
        ]}
      />,
    )
    expect(screen.getByText('Fauna')).toBeInTheDocument()
    expect(screen.getByText('3 (75%)')).toBeInTheDocument()
    expect(screen.queryByText('Fungi')).not.toBeInTheDocument()
    expect(screen.queryByText('Micro-organisms')).not.toBeInTheDocument()
    expect(screen.queryByText(/\(0%\)/)).not.toBeInTheDocument()
  })

  it('shows a tiny non-zero share as <1%, not 0%', () => {
    render(<AnimatedPieChart showValues data={[{ label: 'A', value: 999 }, { label: 'B', value: 1 }]} />)
    expect(screen.getByText('1 (<1%)')).toBeInTheDocument()
  })

  it('says there is no data when every category is 0', () => {
    render(<AnimatedPieChart data={[{ label: 'A', value: 0 }]} />)
    expect(screen.getByText('No data available.')).toBeInTheDocument()
  })
})
