import React from 'react'
import { render, screen } from '@testing-library/react'
import { PricePerUnitPanel } from '../price-per-unit-panel'

type PprPoint = {
  id: string
  address: string
  county: string
  eircode?: string | null
  priceEur: number
  latitude: number | null
  longitude: number | null
  estimatedEircode?: string | null
  estimatedLatitude?: number | null
  estimatedLongitude?: number | null
  descriptionOfProperty?: string | null
}

const makePoint = (overrides: Partial<PprPoint>): PprPoint => ({
  id: '1',
  address: 'Test Address',
  county: 'Dublin',
  priceEur: 300000,
  latitude: 53.3,
  longitude: -6.2,
  ...overrides,
})

describe('PricePerUnitPanel', () => {
  it('returns null when no points', () => {
    const { container } = render(<PricePerUnitPanel points={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows message when points have no parseable bed data', () => {
    const points = [
      makePoint({ descriptionOfProperty: null }),
      makePoint({ descriptionOfProperty: 'Apartment' }),
    ]
    render(<PricePerUnitPanel points={points} />)
    expect(screen.getByText('No bedroom data available for these properties')).toBeInTheDocument()
  })

  it('groups and displays average price by bed count', () => {
    const points = [
      makePoint({ id: '1', descriptionOfProperty: '3 bed semi-detached', priceEur: 300000 }),
      makePoint({ id: '2', descriptionOfProperty: '3 bed terraced', priceEur: 310000 }),
      makePoint({ id: '3', descriptionOfProperty: '4 bed detached', priceEur: 450000 }),
    ]
    render(<PricePerUnitPanel points={points} />)
    expect(screen.getByText('3 Bed')).toBeInTheDocument()
    expect(screen.getByText('4 Bed')).toBeInTheDocument()
    expect(screen.getByText('€305,000')).toBeInTheDocument()
    expect(screen.getByText('€450,000')).toBeInTheDocument()
  })

  it('calculates average correctly for multiple points with same bed count', () => {
    const points = [
      makePoint({ id: '1', descriptionOfProperty: '2 bed apartment', priceEur: 200000 }),
      makePoint({ id: '2', descriptionOfProperty: '2 bed apartment', priceEur: 220000 }),
      makePoint({ id: '3', descriptionOfProperty: '2 bed maisonette', priceEur: 210000 }),
    ]
    render(<PricePerUnitPanel points={points} />)
    expect(screen.getByText('2 Bed')).toBeInTheDocument()
    expect(screen.getByText('€210,000')).toBeInTheDocument()
  })

  it('excludes points with bed count outside 1-10 range', () => {
    const points = [
      makePoint({ id: '1', descriptionOfProperty: '0 bed studio', priceEur: 150000 }),
      makePoint({ id: '2', descriptionOfProperty: '3 bed house', priceEur: 300000 }),
      makePoint({ id: '3', descriptionOfProperty: '11 bed mansion', priceEur: 2000000 }),
    ]
    render(<PricePerUnitPanel points={points} />)
    expect(screen.getByText('3 Bed')).toBeInTheDocument()
    expect(screen.queryByText('0 Bed')).not.toBeInTheDocument()
    expect(screen.queryByText('11 Bed')).not.toBeInTheDocument()
  })
})
