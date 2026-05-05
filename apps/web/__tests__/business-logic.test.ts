describe('Housing Explorer business logic', () => {
  describe('Growth percentage calculation', () => {
    const calcGrowth = (current: number, previous: number): number | null => {
      if (previous <= 0) return null
      return ((current - previous) / previous) * 100
    }

    it('calculates positive growth', () => {
      expect(calcGrowth(125.5, 120.0)).toBeCloseTo(4.58, 2)
    })

    it('calculates negative growth', () => {
      expect(calcGrowth(110.0, 120.0)).toBeCloseTo(-8.33, 2)
    })

    it('returns null when previous is zero', () => {
      expect(calcGrowth(100, 0)).toBeNull()
    })

    it('returns null when previous is negative', () => {
      expect(calcGrowth(100, -50)).toBeNull()
    })

    it('returns zero for equal values', () => {
      expect(calcGrowth(100, 100)).toBe(0)
    })

    it('handles large price differences', () => {
      expect(calcGrowth(500000, 250000)).toBe(100)
    })
  })

  describe('Crime category name cleaning', () => {
    const cleanCategoryName = (name: string) => {
      return name
        .replace(/offences\s*\(.*?\)/i, '')
        .replace(/offences\s+/i, '')
        .trim()
    }

    it('removes Offences prefix with parentheses', () => {
      expect(cleanCategoryName('Offences (Burglary related)')).toBe('')
    })

    it('removes standalone Offences prefix', () => {
      expect(cleanCategoryName('Offences against the person')).toBe('against the person')
    })

    it('handles lowercase', () => {
      expect(cleanCategoryName('offences (Theft)')).toBe('')
    })

    it('preserves clean names', () => {
      expect(cleanCategoryName('Homicide')).toBe('Homicide')
    })
  })

  describe('Eircode routing key extraction', () => {
    const extractRoutingKey = (eircode: string | null | undefined): string | null => {
      if (!eircode) return null
      const normalized = eircode.trim().toUpperCase().replace(/\s+/g, '')
      if (normalized.length < 3) return null
      return normalized.slice(0, 3)
    }

    it('extracts routing key from full eircode', () => {
      expect(extractRoutingKey('D02 X285')).toBe('D02')
    })

    it('handles eircode without space', () => {
      expect(extractRoutingKey('D02X285')).toBe('D02')
    })

    it('handles null input', () => {
      expect(extractRoutingKey(null)).toBeNull()
    })

    it('handles undefined input', () => {
      expect(extractRoutingKey(undefined)).toBeNull()
    })

    it('handles empty string', () => {
      expect(extractRoutingKey('')).toBeNull()
    })

    it('lowercases to uppercase', () => {
      expect(extractRoutingKey('d02 x285')).toBe('D02')
    })
  })

  describe('Price formatting', () => {
    const formatPrice = (priceEur: number): string => {
      return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(priceEur)
    }

    it('formats thousands', () => {
      expect(formatPrice(350000)).toBe('€350,000')
    })

    it('formats hundreds of thousands', () => {
      expect(formatPrice(125000)).toBe('€125,000')
    })

    it('formats millions', () => {
      expect(formatPrice(1500000)).toBe('€1,500,000')
    })

    it('formats small amounts', () => {
      expect(formatPrice(50000)).toBe('€50,000')
    })
  })

  describe('Build phase guard', () => {
    const originalPhase = process.env.NEXT_PHASE

    afterEach(() => {
      process.env.NEXT_PHASE = originalPhase
    })

    it('identifies build phase correctly', () => {
      process.env.NEXT_PHASE = 'phase-production-build'
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
      expect(isBuildPhase).toBe(true)
    })

    it('identifies non-build phase correctly', () => {
      process.env.NEXT_PHASE = undefined
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
      expect(isBuildPhase).toBe(false)
    })

    it('identifies dev phase correctly', () => {
      process.env.NEXT_PHASE = 'phase-development-server'
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
      expect(isBuildPhase).toBe(false)
    })
  })

  describe('Pagination calculations', () => {
    const calcPagination = (totalCount: number, pageSize: number) => {
      const totalPages = Math.ceil(totalCount / pageSize)
      return { totalPages, hasNextPage: (page: number) => page < totalPages, hasPrevPage: (page: number) => page > 1 }
    }

    it('calculates correct total pages', () => {
      const { totalPages } = calcPagination(250, 100)
      expect(totalPages).toBe(3)
    })

    it('handles exact page multiples', () => {
      const { totalPages } = calcPagination(200, 100)
      expect(totalPages).toBe(2)
    })

    it('handles zero records', () => {
      const { totalPages, hasNextPage, hasPrevPage } = calcPagination(0, 100)
      expect(totalPages).toBe(0)
      expect(hasNextPage(1)).toBe(false)
      expect(hasPrevPage(1)).toBe(false)
    })

    it('handles single record', () => {
      const { totalPages, hasNextPage, hasPrevPage } = calcPagination(1, 100)
      expect(totalPages).toBe(1)
      expect(hasNextPage(1)).toBe(false)
      expect(hasPrevPage(1)).toBe(false)
    })

    it('detects next page availability', () => {
      const { hasNextPage } = calcPagination(250, 100)
      expect(hasNextPage(1)).toBe(true)
      expect(hasNextPage(2)).toBe(true)
      expect(hasNextPage(3)).toBe(false)
    })

    it('detects previous page availability', () => {
      const { hasPrevPage } = calcPagination(250, 100)
      expect(hasPrevPage(1)).toBe(false)
      expect(hasPrevPage(2)).toBe(true)
      expect(hasPrevPage(3)).toBe(true)
    })
  })

  describe('Filter range validation', () => {
    const isValidPriceRange = (min?: number, max?: number): boolean => {
      if (min !== undefined && max !== undefined && min > max) return false
      if (min !== undefined && min < 0) return false
      if (max !== undefined && max < 0) return false
      return true
    }

    it('accepts valid range', () => {
      expect(isValidPriceRange(100000, 500000)).toBe(true)
    })

    it('accepts min only', () => {
      expect(isValidPriceRange(100000)).toBe(true)
    })

    it('accepts max only', () => {
      expect(isValidPriceRange(undefined, 500000)).toBe(true)
    })

    it('accepts no filters', () => {
      expect(isValidPriceRange()).toBe(true)
    })

    it('rejects inverted range', () => {
      expect(isValidPriceRange(500000, 100000)).toBe(false)
    })

    it('rejects negative min', () => {
      expect(isValidPriceRange(-100)).toBe(false)
    })

    it('rejects negative max', () => {
      expect(isValidPriceRange(undefined, -100)).toBe(false)
    })
  })

  describe('Area sentiment classification', () => {
    const classifySentiment = (growthPercent: number | null): 'Growth Phase' | 'Cooling' | 'Stable' => {
      if (growthPercent === null) return 'Stable'
      if (growthPercent > 0) return 'Growth Phase'
      if (growthPercent < 0) return 'Cooling'
      return 'Stable'
    }

    it('classifies positive growth', () => {
      expect(classifySentiment(5.2)).toBe('Growth Phase')
    })

    it('classifies negative growth', () => {
      expect(classifySentiment(-3.1)).toBe('Cooling')
    })

    it('classifies zero growth as stable', () => {
      expect(classifySentiment(0)).toBe('Stable')
    })

    it('classifies null growth as stable', () => {
      expect(classifySentiment(null)).toBe('Stable')
    })

    it('classifies very small positive as growth', () => {
      expect(classifySentiment(0.01)).toBe('Growth Phase')
    })

    it('classifies very small negative as cooling', () => {
      expect(classifySentiment(-0.01)).toBe('Cooling')
    })
  })
})
