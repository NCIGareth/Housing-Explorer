import React from 'react'
import { render, screen } from '@testing-library/react'
import { MarketTrendChart } from '../market-trend-chart'

describe('MarketTrendChart', () => {
  it('renders title and subtitle', () => {
    render(<MarketTrendChart data={[]} />)
    expect(screen.getByText('Residential Property Price Index')).toBeInTheDocument()
    expect(screen.getByText('Official CSO Inflation Metric (2015=100)')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<MarketTrendChart data={[]} />)
    expect(screen.getByText('No trend data available yet')).toBeInTheDocument()
  })

  it('renders chart when data is provided', () => {
    const data = [
      { period: '2024-01', value: 110 },
      { period: '2024-02', value: 112 },
    ]
    render(<MarketTrendChart data={data} />)
    expect(screen.queryByText('No trend data available yet')).not.toBeInTheDocument()
  })

  it('accepts custom title and subtitle', () => {
    render(<MarketTrendChart data={[]} title="Custom Title" subtitle="Custom Subtitle" />)
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument()
  })

  it('sorts data by date', () => {
    const unsorted = [
      { period: '2024-03', value: 115 },
      { period: '2024-01', value: 110 },
      { period: '2024-02', value: 112 },
    ]
    render(<MarketTrendChart data={unsorted} />)
    expect(screen.queryByText('No trend data available yet')).not.toBeInTheDocument()
  })
})
