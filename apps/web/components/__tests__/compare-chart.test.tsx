import React from 'react'
import { render, screen } from '@testing-library/react'
import { CompareChart } from '../compare-chart'

describe('CompareChart', () => {
  it('shows empty state when no data', () => {
    render(<CompareChart data={[]} areas={[]} mode="index" />)
    expect(screen.getByText('Select areas above to compare price trends')).toBeInTheDocument()
  })

  it('renders title and index-mode description', () => {
    const data = [
      { period: '2024-01', Dublin: 110, Cork: 100 },
    ]
    render(<CompareChart data={data} areas={['Dublin', 'Cork']} mode="index" />)
    expect(screen.getByText('Price Trend Comparison')).toBeInTheDocument()
    expect(screen.getByText('CSO Residential Property Price Index (2015 = 100) across selected counties')).toBeInTheDocument()
  })

  it('renders median-mode description', () => {
    const data = [
      { period: '2024-04', Dublin: 450000, D20: 420000 },
    ]
    render(<CompareChart data={data} areas={['Dublin', 'D20']} mode="median" />)
    expect(screen.getByText('PPR median sale price (€, quarterly) across selected areas')).toBeInTheDocument()
  })

  it('renders chart when data is provided', () => {
    const data = [
      { period: '2024-01', Dublin: 100 },
    ]
    render(<CompareChart data={data} areas={['Dublin']} mode="index" />)
    expect(screen.queryByText('Select areas above to compare price trends')).not.toBeInTheDocument()
  })

  it('renders chart title with single area', () => {
    const data = [
      { period: '2024-01', Dublin: 100 },
    ]
    render(<CompareChart data={data} areas={['Dublin']} mode="index" />)
    expect(screen.getByText('Price Trend Comparison')).toBeInTheDocument()
  })
})
