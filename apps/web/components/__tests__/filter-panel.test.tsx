import React from 'react'
import { render, screen } from '@testing-library/react'
import { FilterPanel } from '../filter-panel'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [{ key: 'D14', county: 'Dublin', locality: 'Rathfarnham' }] }),
    })
  ) as unknown as typeof fetch
})

describe('FilterPanel', () => {
  it('renders search filters form', () => {
    render(<FilterPanel counties={['Dublin']} />)

    expect(screen.getByText('Search Filters')).toBeInTheDocument()
    expect(screen.getByText('Counties')).toBeInTheDocument()
    expect(screen.getByText('Eircode Sector')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('No limit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Explorer' })).toBeInTheDocument()
  })

  it('displays default values', () => {
    render(<FilterPanel counties={['Dublin']} />)

    expect(screen.getByRole('button', { name: /Dublin/ })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toHaveValue(null)
    expect(screen.getByPlaceholderText('No limit')).toHaveValue(null)
  })

  it('displays provided values', () => {
    render(<FilterPanel
      counties={['Cork']}
      eircodes={['T12']}
      minPriceEur={300000}
      maxPriceEur={500000}
    />)

    expect(screen.getByRole('button', { name: /Cork/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /T12/ })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toHaveValue(300000)
    expect(screen.getByPlaceholderText('No limit')).toHaveValue(500000)
  })

  it('has correct form attributes', () => {
    render(<FilterPanel counties={['Dublin']} />)

    const form = document.querySelector('form')
    expect(form).toHaveAttribute('method', 'get')
    expect(form).toHaveAttribute('action', '/')
  })
})
