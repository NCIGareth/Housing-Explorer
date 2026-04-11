import React from 'react'
import { render, screen } from '@testing-library/react'
import { ComparisonCharts } from '../comparison-charts'

// Mock ResizeObserver which is needed by Recharts ResponsiveContainer
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ComparisonCharts', () => {
  it('renders price trend title', () => {
    render(<ComparisonCharts historical={[]} />)

    expect(screen.getByText('Market Price Trend')).toBeInTheDocument()
  })

  it('displays subtitle when provided', () => {
    const subtitle = 'Test subtitle'
    render(<ComparisonCharts historical={[]} subtitle={subtitle} />)

    expect(screen.getByText(subtitle)).toBeInTheDocument()
  })

  it('shows no data message when historical is empty', () => {
    render(<ComparisonCharts historical={[]} />)

    expect(screen.getByText('No series data for this county yet.')).toBeInTheDocument()
  })

  it('renders chart when historical data is provided', () => {
    const historicalData = [
      { period: '2024-Q1', value: 100000 },
      { period: '2024-Q2', value: 105000 },
    ]

    render(<ComparisonCharts historical={historicalData} />)

    // The chart should be rendered (we can't easily test the actual chart rendering
    // but we can check that the no data message is not shown)
    expect(screen.queryByText('No series data for this county yet.')).not.toBeInTheDocument()
  })

  it('renders with subtitle and data', () => {
    const historicalData = [
      { period: '2024-Q1', value: 100000 },
    ]
    const subtitle = 'CSO residential price index'

    render(<ComparisonCharts historical={historicalData} subtitle={subtitle} />)

    expect(screen.getByText('Market Price Trend')).toBeInTheDocument()
    expect(screen.getByText(subtitle)).toBeInTheDocument()
    expect(screen.queryByText('No series data for this county yet.')).not.toBeInTheDocument()
  })
})