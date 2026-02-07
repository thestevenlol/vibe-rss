module.exports = {
  // Use different test environments based on file location
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/backend/**/*.test.js'],
      collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js', // Exclude main entry point from coverage (tested via integration)
      ],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/test/frontend/**/*.test.js'],
      collectCoverageFrom: [
        'public/**/*.js',
        '!public/**/*.test.js',
      ],
    },
  ],

  // Coverage thresholds (80% minimum, functions at 75% due to uncovered server startup)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text-summary', 'html', 'lcov'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Coverage directory
  coverageDirectory: 'coverage',
};
