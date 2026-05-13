const createJestConfig = require('next/jest')

const nextJest = createJestConfig({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
}

module.exports = nextJest(config)
