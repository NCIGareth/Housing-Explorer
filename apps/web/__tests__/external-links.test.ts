import {
  getGoogleFloorplanSearchUrl,
  getDaftHistorySearchUrl,
  getPlanningMapUrl,
  getSeaiBerRegisterUrl,
  getGoogleMapsUrl,
} from '../lib/external-links'

describe('external-links', () => {
  describe('getGoogleFloorplanSearchUrl', () => {
    it('generates a Google Images search URL scoped to Daft and MyHome', () => {
      const url = getGoogleFloorplanSearchUrl('123 Main St, Dublin 4')
      expect(url).toContain('https://www.google.com/search?q=')
      expect(url).toContain('tbm=isch')
      expect(url).toContain('site%3Adaft.ie')
      expect(url).toContain('site%3Amyhome.ie')
      expect(url).toContain('floorplans')
    })

    it('URL-encodes special characters in the address', () => {
      const url = getGoogleFloorplanSearchUrl('10 O\'Brien St & Co.')
      expect(url).toContain('%20')
      expect(url).toContain('%26')
    })
  })

  describe('getDaftHistorySearchUrl', () => {
    it('generates a Google search scoped to daft.ie', () => {
      const url = getDaftHistorySearchUrl('45 Church Rd, Cork')
      expect(url).toContain('https://www.google.com/search?q=')
      expect(url).toContain('site%3Adaft.ie')
      expect(url).toContain('45')
      expect(url).toContain('Church')
    })

    it('does not include tbm parameter', () => {
      const url = getDaftHistorySearchUrl('Test')
      expect(url).not.toContain('tbm=')
    })
  })

  describe('getPlanningMapUrl', () => {
    it('generates a Google search for planning applications', () => {
      const url = getPlanningMapUrl('10 Main St', 'Dublin')
      expect(url).toContain('https://www.google.com/search?q=')
      expect(url).toContain('planning')
      expect(url).toContain('application')
      expect(url).toContain('Dublin')
    })

    it('includes both address and county', () => {
      const url = getPlanningMapUrl('Elm House', 'Galway')
      expect(url).toContain('Elm')
      expect(url).toContain('Galway')
    })
  })

  describe('getSeaiBerRegisterUrl', () => {
    it('returns a static SEAI BER register URL', () => {
      const url = getSeaiBerRegisterUrl()
      expect(url).toBe('https://ndber.seai.ie/pass/ber/search.aspx')
    })

    it('does not depend on any arguments', () => {
      const url1 = getSeaiBerRegisterUrl()
      const url2 = getSeaiBerRegisterUrl()
      expect(url1).toBe(url2)
    })
  })

  describe('getGoogleMapsUrl', () => {
    it('generates a Google Maps search URL with address only', () => {
      const url = getGoogleMapsUrl('123 Main St, Dublin')
      expect(url).toContain('https://www.google.com/maps/search/')
      expect(url).toContain('api=1')
      expect(url).toContain('query=')
      expect(url).toContain('123')
    })

    it('includes eircode when provided', () => {
      const url = getGoogleMapsUrl('123 Main St', 'D02 X285')
      expect(url).toContain('D02')
      expect(url).toContain('X285')
    })

    it('omits eircode when not provided', () => {
      const url = getGoogleMapsUrl('123 Main St')
      expect(url).not.toContain('D02')
    })

    it('omits eircode when undefined', () => {
      const url = getGoogleMapsUrl('123 Main St', undefined)
      expect(url).not.toContain('undefined')
    })

    it('URL-encodes special characters in the query', () => {
      const url = getGoogleMapsUrl('O\'Brien St & Main Rd')
      expect(url).toContain('%20')
      expect(url).toContain('%26')
    })
  })
})
