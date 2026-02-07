const request = require('supertest');
const axios = require('axios');
const app = require('../../../src/server');
const { readFixture } = require('../../fixtures/helper');

// Mock axios
jest.mock('axios');

describe('RSS Route Handler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('URL Validation', () => {
    test('should return 400 when url query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/rss')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'Missing required query parameter: url'
      });
    });

    test('should return 400 when url parameter is empty string', async () => {
      const response = await request(app)
        .get('/api/rss?url=')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'Missing required query parameter: url'
      });
    });

    test('should return 400 for malformed URL without protocol', async () => {
      const response = await request(app)
        .get('/api/rss?url=example.com/feed')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    });

    test('should return 400 for completely invalid URL format', async () => {
      const response = await request(app)
        .get('/api/rss?url=not-a-valid-url')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    });

    test('should accept non-HTTP protocols (URL constructor allows them)', async () => {
      // URL constructor accepts ftp://, file://, etc. as valid URLs
      // The API will try to fetch them, and axios will likely fail
      // This test documents the current behavior
      axios.get.mockRejectedValue({
        request: {},
        message: 'Protocol not supported'
      });

      const response = await request(app)
        .get('/api/rss?url=ftp://example.com/feed.xml')
        .expect(503); // Network error because axios doesn't support FTP

      expect(response.body.error).toBe('Service Unavailable');
    });

    test('should accept valid HTTP URL', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const response = await request(app)
        .get('/api/rss?url=http://example.com/feed.xml')
        .expect(200);

      expect(axios.get).toHaveBeenCalledWith(
        'http://example.com/feed.xml',
        expect.objectContaining({
          headers: { 'User-Agent': 'RSS-Fetch-API/1.0' },
          timeout: 10000,
          maxRedirects: 5
        })
      );
    });

    test('should accept valid HTTPS URL', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(axios.get).toHaveBeenCalled();
    });

    test('should handle URLs with special characters', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed?category=tech%26news')
        .expect(200);

      expect(axios.get).toHaveBeenCalled();
    });
  });

  describe('Successful RSS Fetch', () => {
    test('should return 200 and raw RSS XML for valid request', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const response = await request(app)
        .get('/api/rss?url=https://feeds.bbci.co.uk/news/rss.xml')
        .expect(200);

      expect(response.text).toBe(validXML);
      expect(response.headers['content-type']).toMatch(/application\/xml/);
    });

    test('should return Atom XML when feed is Atom format', async () => {
      const atomXML = readFixture('atom-valid.xml');
      axios.get.mockResolvedValue({ data: atomXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/atom.xml')
        .expect(200);

      expect(response.text).toBe(atomXML);
      expect(response.text).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    });

    test('should call axios with correct User-Agent header', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        expect.objectContaining({
          headers: { 'User-Agent': 'RSS-Fetch-API/1.0' }
        })
      );
    });

    test('should call axios with 10 second timeout', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        expect.objectContaining({
          timeout: 10000
        })
      );
    });

    test('should call axios with max 5 redirects', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        expect.objectContaining({
          maxRedirects: 5
        })
      );
    });

    test('should return empty RSS feed correctly', async () => {
      const emptyXML = readFixture('rss-empty.xml');
      axios.get.mockResolvedValue({ data: emptyXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/empty.xml')
        .expect(200);

      expect(response.text).toBe(emptyXML);
    });
  });

  describe('Axios Error Handling - error.response', () => {
    test('should return 404 when feed URL returns 404', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/nonexistent.xml')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Feed Fetch Failed',
        message: 'Unable to fetch RSS feed: Not Found',
        statusCode: 404
      });
    });

    test('should return 500 when feed server returns 500', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Feed Fetch Failed',
        message: 'Unable to fetch RSS feed: Internal Server Error',
        statusCode: 500
      });
    });

    test('should return 403 when feed server denies access', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden'
        }
      });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/private.xml')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Feed Fetch Failed',
        message: 'Unable to fetch RSS feed: Forbidden',
        statusCode: 403
      });
    });

    test('should return original status code from upstream server', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 503,
          statusText: 'Service Unavailable'
        }
      });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(503);

      expect(response.body.statusCode).toBe(503);
    });

    test('should include error and message fields in response', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 401,
          statusText: 'Unauthorized'
        }
      });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Axios Error Handling - error.request', () => {
    test('should return 503 when no response received (network failure)', async () => {
      axios.get.mockRejectedValue({
        request: {},
        message: 'Network Error'
      });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(503);

      expect(response.body).toEqual({
        error: 'Service Unavailable',
        message: 'Unable to reach the RSS feed URL. Please check the URL and try again.'
      });
    });

    test('should return 503 on timeout', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      timeoutError.request = {};

      axios.get.mockRejectedValue(timeoutError);

      const response = await request(app)
        .get('/api/rss?url=https://slow-server.com/feed.xml')
        .expect(503);

      expect(response.body.error).toBe('Service Unavailable');
    });

    test('should return 503 on DNS resolution failure', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      dnsError.code = 'ENOTFOUND';
      dnsError.request = {};

      axios.get.mockRejectedValue(dnsError);

      const response = await request(app)
        .get('/api/rss?url=https://nonexistent-domain-12345.com/feed.xml')
        .expect(503);

      expect(response.body.error).toBe('Service Unavailable');
    });

    test('should return 503 on connection refused', async () => {
      const connError = new Error('connect ECONNREFUSED');
      connError.code = 'ECONNREFUSED';
      connError.request = {};

      axios.get.mockRejectedValue(connError);

      const response = await request(app)
        .get('/api/rss?url=https://localhost:9999/feed.xml')
        .expect(503);

      expect(response.body.error).toBe('Service Unavailable');
    });
  });

  describe('Axios Error Handling - Setup Errors', () => {
    test('should return 500 for axios configuration errors', async () => {
      const setupError = new Error('Invalid axios configuration');
      // No request or response property = setup error

      axios.get.mockRejectedValue(setupError);

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal Server Error',
        message: 'An error occurred while processing the request'
      });
    });

    test('should return 500 for unexpected errors', async () => {
      axios.get.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
    });
  });

  describe('Response Format Validation', () => {
    test('success response should have Content-Type application/xml', async () => {
      const validXML = readFixture('rss-valid.xml');
      axios.get.mockResolvedValue({ data: validXML });

      const response = await request(app)
        .get('/api/rss?url=https://example.com/feed.xml')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/xml/);
    });

    test('error responses should be JSON format', async () => {
      const response = await request(app)
        .get('/api/rss?url=invalid')
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('all error responses should have consistent structure', async () => {
      const response = await request(app)
        .get('/api/rss')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
    });
  });
});
