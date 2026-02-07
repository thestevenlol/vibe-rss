# Copilot Instructions for RSS Fetch API

## Project Architecture

This is a **two-tier RSS proxy service**: an Express.js backend that fetches RSS feeds and serves a vanilla JavaScript frontend.

- **Backend** (`src/`): Express server acts as a proxy to fetch RSS feeds via axios, handles CORS, and serves static files
- **Frontend** (`public/`): Vanilla HTML/CSS/JS client that displays RSS/Atom feeds (no framework)
- **Single server** pattern: Express serves both the API at `/api/rss` and static frontend files

## Critical Workflows

**Development:**
```bash
npm run dev  # Uses Node.js --watch (requires Node 18+)
npm start    # Production server
```

**Environment:** Configure `PORT` via `.env` file (defaults to 3000)

**Testing endpoints manually:**
```bash
curl "http://localhost:3000/api/rss?url=https://feeds.bbci.co.uk/news/rss.xml"
curl http://localhost:3000/health
```

**Testing Requirements:**
- All new code or major code changes **must** include tests
- Tests must run and pass before a task is considered complete
- Use Jest or Mocha for backend tests; test both success and error paths
- Test coverage should include: API routes, error handling, URL validation, axios error types
- Run tests with `npm test` (configure in package.json if not present)

## Project-Specific Patterns

### API Design
- **Query parameter API**: `/api/rss?url=<RSS_URL>` - URL validation happens in route handler
- **Error format**: Always return `{error: string, message: string, statusCode?: number}`
- **Status codes**: 400 (bad request), 503 (feed unreachable), 500 (internal error)
- **Content-Type**: Backend returns raw XML with `application/xml` header

### Backend Conventions
- Routes live in `src/routes/` as Express Router modules (see [rss.js](src/routes/rss.js))
- Use axios with custom User-Agent: `'RSS-Fetch-API/1.0'`
- Set 10-second timeout and max 5 redirects on feed requests
- Distinguish between axios error types: `error.response`, `error.request`, or setup errors

### Frontend Conventions
- **Vanilla JS** - no frameworks, manual DOM manipulation
- Parse XML with `DOMParser` - support both RSS 2.0 and Atom formats (see [app.js](public/app.js#L75-L85))
- Check for `parsererror` element after parsing XML
- Display feed stats (item count, description) and render articles as cards

## Key Integration Points

- Backend fetches external RSS feeds via axios, returns raw XML to frontend
- Frontend calls `/api/rss?url=<URL>`, then parses XML client-side
- CORS enabled to allow future cross-origin usage
- Static file serving from `public/` via Express middleware
