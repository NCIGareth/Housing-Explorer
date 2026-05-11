import '@testing-library/jest-dom'

// Recharts charts require ResizeObserver in test environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

