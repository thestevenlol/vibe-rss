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
