import React from 'react'
import { render, screen } from '@testing-library/react'
import { CompareChart } from '../compare-chart'

describe('CompareChart', () => {
  it('shows empty state when no data', () => {
    render(<CompareChart data={[]} areas={[]} />)
    expect(screen.getByText('Select areas above to compare price trends')).toBeInTheDocument()
  })

  it('renders title and description', () => {
    const data = [
      { period: '2024-01', Dublin: 110, Cork: 100 },
    ]
    render(<CompareChart data={data} areas={['Dublin', 'Cork']} />)
    expect(screen.getByText('Price Trend Comparison')).toBeInTheDocument()
    expect(screen.getByText('Historical median / index values across selected areas')).toBeInTheDocument()
  })

  it('renders chart when data is provided', () => {
    const data = [
      { period: '2024-01', Dublin: 100 },
    ]
    render(<CompareChart data={data} areas={['Dublin']} />)
    expect(screen.queryByText('Select areas above to compare price trends')).not.toBeInTheDocument()
  })

  it('renders chart title with single area', () => {
    const data = [
      { period: '2024-01', Dublin: 100 },
    ]
    render(<CompareChart data={data} areas={['Dublin']} />)
    expect(screen.getByText('Price Trend Comparison')).toBeInTheDocument()
  })
})
