const request = require('supertest');
const axios = require('axios');
const app = require('../../../src/server');
const { readFixture } = require('../../fixtures/helper');

// Mock axios for integration tests
jest.mock('axios');

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Request/Response Lifecycle', () => {
    test('should handle complete RSS fetch workflow', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const response = await request(app)
        .get('/api/rss')
        .query({ url: 'https://feeds.bbci.co.uk/news/rss.xml' })
        .expect(200)
        .expect('Content-Type', /application\/xml/);

      expect(response.text).toContain('<rss version="2.0">');
      expect(response.text).toContain('BBC News');
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should handle complete Atom feed workflow', async () => {
      const atomXML = readFixture('atom-valid.xml');
      axios.get.mockResolvedValue({ data: atomXML });

      const response = await request(app)
        .get('/api/rss')
        .query({ url: 'https://example.com/atom.xml' })
        .expect(200)
        .expect('Content-Type', /application\/xml/);

      expect(response.text).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
      expect(response.text).toContain('Example Atom Feed');
    });

    test('should handle validation -> error response workflow', async () => {
      const response = await request(app)
        .get('/api/rss')
        .query({ url: 'not-a-url' })
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toContain('Invalid URL format');
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should handle axios error -> error response workflow', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      });

      const response = await request(app)
        .get('/api/rss')
        .query({ url: 'https://example.com/missing.xml' })
        .expect(404)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('Feed Fetch Failed');
      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('Multiple Requests', () => {
    test('should handle multiple successful requests', async () => {
      const rssXML = readFixture('rss-valid.xml');
      const atomXML = readFixture('atom-valid.xml');

      axios.get
        .mockResolvedValueOnce({ data: rssXML })
        .mockResolvedValueOnce({ data: atomXML });

      const response1 = await request(app)
        .get('/api/rss?url=https://example.com/rss.xml')
        .expect(200);

      const response2 = await request(app)
        .get('/api/rss?url=https://example.com/atom.xml')
        .expect(200);

      expect(response1.text).toContain('<rss version="2.0">');
      expect(response2.text).toContain('<feed xmlns');
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('should handle mix of success and error requests', async () => {
      const validXML = readFixture('rss-valid.xml');

      axios.get
        .mockResolvedValueOnce({ data: validXML })
        .mockRejectedValueOnce({
          request: {},
          message: 'Network Error'
        });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      await request(app)
        .get('/api/rss?url=https://failing.com/feed.xml')
        .expect(503);
    });
  });

  describe('Cross-Cutting Concerns', () => {
    test('CORS headers should be present on API responses', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('CORS headers should be present on error responses', async () => {
      const response = await request(app)
        .get('/api/rss')
        .expect(400);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle query string encoding correctly', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss')
        .query({ url: 'https://example.com/feed?cat=tech&lang=en' })
        .expect(200);

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/feed?cat=tech&lang=en',
        expect.any(Object)
      );
    });
  });

  describe('Health Check Integration', () => {
    test('health check should work alongside API routes', async () => {
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('ok');

      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const apiResponse = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(apiResponse.text).toBe(validXML);
    });
  });

  describe('Static File Serving Integration', () => {
    test('should serve frontend files while API is functioning', async () => {
      const htmlResponse = await request(app)
        .get('/index.html')
        .expect(200);

      expect(htmlResponse.text).toContain('<!DOCTYPE html>');

      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const apiResponse = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(apiResponse.text).toBe(validXML);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from failed request and process next request', async () => {
      const validXML = readFixture('rss-valid.xml');

      axios.get
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(500);

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);
    });

    test('should handle validation errors without affecting subsequent requests', async () => {
      await request(app)
        .get('/api/rss?url=invalid-url')
        .expect(400);

      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty feed correctly', async () => {
      const emptyXML = readFixture('rss-empty.xml');
      axios.get.mockResolvedValue({ data: emptyXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/empty.xml')
        .expect(200);

      expect(response.text).toContain('<channel>');
      expect(response.text).toContain('Empty RSS Feed');
    });

    test('should handle feed with missing optional elements', async () => {
      const incompleteXML = readFixture('rss-missing-elements.xml');
      axios.get.mockResolvedValue({ data: incompleteXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/incomplete.xml')
        .expect(200);

      expect(response.text).toContain('Incomplete RSS Feed');
    });

    test('should pass through malformed XML to client', async () => {
      const malformedXML = readFixture('rss-malformed.xml');
      axios.get.mockResolvedValue({ data: malformedXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/bad.xml')
        .expect(200);

      // Server doesn't validate XML structure, just passes it through
      expect(response.text).toBe(malformedXML);
    });
  });

  describe('Axios Configuration Integration', () => {
    test('should apply all axios config options in integration', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        {
          headers: {
            'User-Agent': 'RSS-Fetch-API/1.0'
          },
          timeout: 10000,
          maxRedirects: 5
        }
      );
    });
  });
});
