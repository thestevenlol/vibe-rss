const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GET /api/rss?url=<RSS_URL>
 * Fetches RSS feed from the provided URL and returns raw XML
 */
router.get('/', async (req, res) => {
  try {
    const { url } = req.query;

    // Validate URL parameter
    if (!url) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required query parameter: url'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    }

    // Fetch the RSS feed
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'RSS-Fetch-API/1.0'
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5
    });

    // Set appropriate content type and return raw XML
    res.set('Content-Type', 'application/xml');
    res.send(response.data);

  } catch (error) {
    // Handle axios errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return res.status(error.response.status).json({
        error: 'Feed Fetch Failed',
        message: `Unable to fetch RSS feed: ${error.response.statusText}`,
        statusCode: error.response.status
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Unable to reach the RSS feed URL. Please check the URL and try again.'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while processing the request'
      });
    }
  }
});

module.exports = router;
