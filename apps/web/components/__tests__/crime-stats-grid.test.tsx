import React from 'react'
import { render, screen } from '@testing-library/react'
import { CrimeStatsGrid } from '../crime-stats-grid'

describe('CrimeStatsGrid', () => {
  it('shows empty state when no stats', () => {
    render(<CrimeStatsGrid stats={[]} county="Dublin" />)
    expect(screen.getByText('No crime data available for Dublin')).toBeInTheDocument()
  })

  it('shows empty state when stats is null', () => {
    render(<CrimeStatsGrid stats={null as unknown as []} county="Cork" />)
    expect(screen.getByText('No crime data available for Cork')).toBeInTheDocument()
  })

  it('renders cleaned crime category names', () => {
    const stats = [
      { category: 'Theft offences (excluding some)', incidents: 100 },
      { category: 'Burglary offences', incidents: 50 },
    ]
    render(<CrimeStatsGrid stats={stats} county="Dublin" />)
    expect(screen.getByText('Theft')).toBeInTheDocument()
    expect(screen.getByText('Burglary')).toBeInTheDocument()
  })

  it('displays incident counts', () => {
    const stats = [
      { category: 'Theft', incidents: 1500 },
    ]
    render(<CrimeStatsGrid stats={stats} county="Dublin" />)
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('limits displayed categories to 5', () => {
    const stats = Array.from({ length: 8 }, (_, i) => ({
      category: `Offence ${i + 1}`,
      incidents: 10 * (i + 1),
    }))
    render(<CrimeStatsGrid stats={stats} county="Dublin" />)
    expect(screen.getAllByText(/Offence/)).toHaveLength(5)
  })

  it('renders without crashing with valid data', () => {
    const stats = [
      { category: 'Theft', incidents: 200 },
      { category: 'Burglary', incidents: 300 },
    ]
    const { container } = render(<CrimeStatsGrid stats={stats} county="Dublin" />)
    expect(container.textContent).toContain('200')
    expect(container.textContent).toContain('300')
  })
})
