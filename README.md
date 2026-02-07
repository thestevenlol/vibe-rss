# RSS Fetch API

A simple Express.js API endpoint for fetching RSS feeds from any URL.

## Features

- Fetch RSS feeds from any valid RSS URL
- Returns raw XML content
- Basic error handling for invalid URLs and unreachable feeds
- CORS enabled for cross-origin requests

## Installation

```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. The server will run on `http://localhost:3000` by default

3. Fetch an RSS feed:
```bash
curl "http://localhost:3000/api/rss?url=https://feeds.bbc.co.uk/news/rss.xml"
```

## API Endpoint

### GET /api/rss

Fetches an RSS feed from the provided URL.

**Query Parameters:**
- `url` (required): The URL of the RSS feed to fetch

**Example Request:**
```bash
curl "http://localhost:3000/api/rss?url=https://news.ycombinator.com/rss"
```

**Success Response:**
- **Code:** 200
- **Content-Type:** application/xml
- **Body:** Raw RSS XML content

**Error Responses:**
- **Code:** 400 - Missing or invalid URL parameter
- **Code:** 503 - Unable to reach the RSS feed
- **Code:** 500 - Internal server error

## Environment Variables

Create a `.env` file based on `.env.example`:

```
PORT=3000
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Development

Run with auto-reload (Node.js 18+):
```bash
npm run dev
```

## Testing

This project includes a comprehensive testing suite with 80%+ code coverage.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Structure

The test suite is organized as follows:

```
test/
├── backend/
│   ├── server.test.js           # Server initialization and middleware tests
│   ├── routes/
│   │   └── rss.test.js          # RSS route handler tests
│   └── integration/
│       └── api.test.js          # End-to-end API tests
├── frontend/
│   ├── app.test.js              # Frontend app logic and DOM tests
│   └── utils.test.js            # Utility function tests
└── fixtures/
    ├── rss-valid.xml            # Sample RSS 2.0 feed
    ├── atom-valid.xml           # Sample Atom feed
    ├── rss-empty.xml            # Empty feed
    ├── rss-missing-elements.xml # Feed with missing optional elements
    ├── rss-malformed.xml        # Malformed XML
    └── helper.js                # Fixture loading utilities
```

### Testing Framework

- **Jest** - Test framework with built-in mocking and assertions
- **Supertest** - HTTP assertions for API testing
- **jsdom** - DOM implementation for frontend testing

### Test Coverage

Coverage thresholds are enforced at 80% minimum for:
- Branches
- Functions
- Lines
- Statements

View the coverage report after running `npm run test:coverage`:
```bash
open coverage/index.html
```

### Writing Tests

When adding new features, ensure tests are included:

**Backend tests** should cover:
- Route handlers and middleware
- URL validation and error handling
- Axios mocking for external API calls
- Response format validation

**Frontend tests** should cover:
- DOM manipulation and event handlers
- XML parsing (RSS 2.0 and Atom)
- Error state management
- Utility functions (HTML escaping, date formatting)

Example test:
```javascript
test('should return 400 when url parameter is missing', async () => {
  const response = await request(app)
    .get('/api/rss')
    .expect(400);

  expect(response.body).toEqual({
    error: 'Bad Request',
    message: 'Missing required query parameter: url'
  });
});
```

### Continuous Integration

Tests are designed to run in CI environments:
```bash
npm run test:ci
```

This command:
- Runs tests in CI mode (no watch)
- Generates coverage reports
- Uses limited workers for better performance
