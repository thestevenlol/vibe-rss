require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rssRouter = require('./routes/rss');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/rss', rssRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RSS Fetch API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/rss?url=<RSS_URL>`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
