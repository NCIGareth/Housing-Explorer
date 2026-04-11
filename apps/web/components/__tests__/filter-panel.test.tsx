import React from 'react'
import { render, screen } from '@testing-library/react'
import { FilterPanel } from '../filter-panel'

describe('FilterPanel', () => {
  it('renders search filters form', () => {
    render(<FilterPanel />)

    expect(screen.getByText('Search Filters')).toBeInTheDocument()
    expect(screen.getByLabelText('County')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. D14')).toBeInTheDocument()
    expect(screen.getByLabelText(/Min Beds/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('No limit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Explorer' })).toBeInTheDocument()
  })

  it('displays default values', () => {
    render(<FilterPanel />)

    expect(screen.getByLabelText('County')).toHaveValue('Dublin')
    expect(screen.getByPlaceholderText('e.g. D14')).toHaveValue('')
    expect(screen.getByLabelText(/Min Beds/i)).toHaveValue('')
    expect(screen.getByPlaceholderText('0')).toHaveValue(null)
    expect(screen.getByPlaceholderText('No limit')).toHaveValue(null)
  })

  it('displays provided values', () => {
    render(<FilterPanel 
      county="Cork" 
      eircode="T12 X3Y4" 
      minPriceEur={300000} 
      maxPriceEur={500000} 
      minBeds={3} 
    />)

    expect(screen.getByLabelText('County')).toHaveValue('Cork')
    expect(screen.getByPlaceholderText('e.g. D14')).toHaveValue('T12 X3Y4')
    expect(screen.getByLabelText(/Min Beds/i)).toHaveValue('3')
    expect(screen.getByPlaceholderText('0')).toHaveValue(300000)
    expect(screen.getByPlaceholderText('No limit')).toHaveValue(500000)
  })

  it('has correct form attributes', () => {
    render(<FilterPanel />)

    const form = document.querySelector('form')
    expect(form).toHaveAttribute('method', 'get')
    expect(form).toHaveAttribute('action', '/')
  })
})