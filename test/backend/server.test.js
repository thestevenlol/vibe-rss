const request = require('supertest');
const express = require('express');
const app = require('../../src/server');

describe('Server Setup', () => {
  describe('Express App Initialization', () => {
    test('app should be defined', () => {
      expect(app).toBeDefined();
    });

    test('app should be an Express application', () => {
      expect(app).toBeInstanceOf(Function);
      expect(typeof app).toBe('function');
    });
  });

  describe('CORS Middleware', () => {
    test('should set CORS headers on requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should allow requests from any origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Static File Serving', () => {
    test('should serve index.html from public directory', async () => {
      const response = await request(app)
        .get('/index.html')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    test('should serve JavaScript files from public directory', async () => {
      const response = await request(app)
        .get('/app.js')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/javascript/);
    });

    test('should serve CSS files from public directory', async () => {
      const response = await request(app)
        .get('/style.css')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/css/);
    });

    test('should return 404 for non-existent static files', async () => {
      await request(app)
        .get('/nonexistent.html')
        .expect(404);
    });
  });

  describe('Health Check Endpoint', () => {
    test('GET /health should return 200 status', async () => {
      await request(app)
        .get('/health')
        .expect(200);
    });

    test('GET /health should return JSON with status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        message: 'RSS Fetch API is running'
      });
    });

    test('GET /health should have status property', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    test('GET /health should have message property', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('JSON Body Parser Middleware', () => {
    test('should parse JSON request bodies', async () => {
      // Note: The API doesn't have POST endpoints yet, but the middleware is configured
      // This verifies the middleware is correctly set up
      const testData = { test: 'data' };
      
      // We'll use a test route to verify JSON parsing works
      // Since there's no POST route, we verify the middleware is present
      expect(app._router.stack.some(layer => 
        layer.name === 'jsonParser'
      )).toBeTruthy();
    });
  });

  describe('Route Registration', () => {
    test('should register /api/rss route', async () => {
      // Without query params, it should return 400 (not 404)
      const response = await request(app)
        .get('/api/rss');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 for undefined routes', async () => {
      await request(app)
        .get('/api/undefined-route')
        .expect(404);
    });
  });
});
