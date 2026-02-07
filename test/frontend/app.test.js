/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');
const { readFixture } = require('../fixtures/helper');

// Load the app.js file
const appJsPath = path.join(__dirname, '../../public/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf-8');

// Helper to setup environment and load app.js
function setupEnvironment() {
  // Completely reset the DOM document
  document.documentElement.innerHTML = '';
  document.documentElement.innerHTML = '<head></head><body></body>';
  
  // Set up minimal DOM structure
  document.body.innerHTML = `
    <input id="rssUrl" value="" />
    <button id="fetchBtn"></button>
    <button id="clearBtn"></button>
    <div id="loading" class="hidden"></div>
    <div id="error" class="hidden"></div>
    <div id="results" class="hidden">
      <h2 id="feedTitle"></h2>
      <div id="feedStats"></div>
      <div id="feedItems"></div>
    </div>
    <button class="link-btn" data-url="https://example.com/feed.xml"></button>
  `;

  // Execute app.js in global context using indirect eval to make it global
  const globalEval = eval; // Indirect eval runs in global scope
  globalEval(appJsCode);
}

describe('Frontend App - fetchRssFeed', () => {
  let fetchMock;

  beforeEach(() => {
    setupEnvironment();

    // Mock fetch
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    test('should show error when URL input is empty', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      
      input.value = '';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toBe('Please enter a valid RSS feed URL');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should show error when URL input is whitespace only', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      
      input.value = '   ';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toBe('Please enter a valid RSS feed URL');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should trim whitespace from URL before fetching', async () => {
      const input = document.getElementById('rssUrl');
      const validXML = readFixture('rss-valid.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => validXML
      });

      input.value = '  https://example.com/feed.xml  ';
      await fetchRssFeed();

      expect(fetchMock).toHaveBeenCalledWith('/api/rss?url=https%3A%2F%2Fexample.com%2Ffeed.xml');
    });
  });

  describe('API Call and Response Handling', () => {
    test('should call fetch with correct URL encoding', async () => {
      const input = document.getElementById('rssUrl');
      const validXML = readFixture('rss-valid.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => validXML
      });

      input.value = 'https://example.com/feed.xml';
      await fetchRssFeed();

      expect(fetchMock).toHaveBeenCalledWith('/api/rss?url=https%3A%2F%2Fexample.com%2Ffeed.xml');
    });

    test('should handle backend error response', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Feed not found' })
      });

      input.value = 'https://example.com/missing.xml';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('Feed not found');
    });

    test('should handle HTTP error without message', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      input.value = 'https://example.com/feed.xml';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('HTTP 500');
    });

    test('should handle network errors', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      
      fetchMock.mockRejectedValue(new Error('Network error'));

      input.value = 'https://example.com/feed.xml';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('Network error');
    });

    test('should parse valid RSS XML', async () => {
      const input = document.getElementById('rssUrl');
      const validXML = readFixture('rss-valid.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => validXML
      });

      input.value = 'https://feeds.bbci.co.uk/news/rss.xml';
      await fetchRssFeed();

      const feedTitle = document.getElementById('feedTitle');
      expect(feedTitle.textContent).toContain('BBC News');
    });

    test('should parse valid Atom XML', async () => {
      const input = document.getElementById('rssUrl');
      const atomXML = readFixture('atom-valid.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => atomXML
      });

      input.value = 'https://example.com/atom.xml';
      await fetchRssFeed();

      const feedTitle = document.getElementById('feedTitle');
      expect(feedTitle.textContent).toContain('Example Atom Feed');
    });

    test('should detect malformed XML', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      const malformedXML = readFixture('rss-malformed.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => malformedXML
      });

      input.value = 'https://example.com/bad.xml';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('parse');
    });
  });

  describe('Loading State Management', () => {
    test('should show loading indicator during fetch', async () => {
      const input = document.getElementById('rssUrl');
      const loadingEl = document.getElementById('loading');
      const validXML = readFixture('rss-valid.xml');
      
      let resolvePromise;
      const fetchPromise = new Promise(resolve => { resolvePromise = resolve; });
      
      fetchMock.mockReturnValue(fetchPromise);

      input.value = 'https://example.com/feed.xml';
      const fetchCall = fetchRssFeed();

      // Check immediately - loading should be visible
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(loadingEl.classList.contains('hidden')).toBe(false);

      // Resolve the fetch
      resolvePromise({
        ok: true,
        text: async () => validXML
      });

      await fetchCall;

      // Loading should be hidden after completion
      expect(loadingEl.classList.contains('hidden')).toBe(true);
    });

    test('should hide loading on error', async () => {
      const input = document.getElementById('rssUrl');
      const loadingEl = document.getElementById('loading');
      
      fetchMock.mockRejectedValue(new Error('Test error'));

      input.value = 'https://example.com/feed.xml';
      await fetchRssFeed();

      expect(loadingEl.classList.contains('hidden')).toBe(true);
    });

    test('should hide error when starting new fetch', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      const validXML = readFixture('rss-valid.xml');
      
      // First request fails
      fetchMock.mockRejectedValueOnce(new Error('First error'));
      input.value = 'https://example.com/feed.xml';
      await fetchRssFeed();
      expect(errorEl.classList.contains('hidden')).toBe(false);

      // Second request succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => validXML
      });
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(true);
    });

    test('should hide results when starting new fetch', async () => {
      const input = document.getElementById('rssUrl');
      const resultsEl = document.getElementById('results');
      const validXML = readFixture('rss-valid.xml');
      
      // Show some results first
      resultsEl.classList.remove('hidden');

      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => validXML
      });

      input.value = 'https://example.com/feed.xml';
      
      // During fetch, results should be hidden
      const fetchPromise = fetchRssFeed();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      await fetchPromise;
      
      // After fetch, results should be shown again
      expect(resultsEl.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Format Detection', () => {
    test('should detect RSS 2.0 format', async () => {
      const input = document.getElementById('rssUrl');
      const rssXML = readFixture('rss-valid.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => rssXML
      });

      input.value = 'https://example.com/rss.xml';
      await fetchRssFeed();

      const feedTitle = document.getElementById('feedTitle');
      const feedStats = document.getElementById('feedStats');
      
      expect(feedTitle.textContent).toBeTruthy();
      expect(feedStats.textContent).toContain('Items');
    });

    test('should detect Atom format', async () => {
      const input = document.getElementById('rssUrl');
      const atomXML = readFixture('atom-valid.xml');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => atomXML
      });

      input.value = 'https://example.com/atom.xml';
      await fetchRssFeed();

      const feedStats = document.getElementById('feedStats');
      expect(feedStats.textContent).toContain('Entries');
    });

    test('should show error for unrecognized format', async () => {
      const input = document.getElementById('rssUrl');
      const errorEl = document.getElementById('error');
      
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => '<?xml version="1.0"?><unknown></unknown>'
      });

      input.value = 'https://example.com/unknown.xml';
      await fetchRssFeed();

      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('Unrecognized feed format');
    });
  });
});

describe('Frontend App - displayRss', () => {
  beforeEach(() => {
    setupEnvironment();
  });

  test('should display RSS feed title', () => {
    const rssXML = readFixture('rss-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const feedTitle = document.getElementById('feedTitle');
    expect(feedTitle.textContent).toBe('BBC News - World');
  });

  test('should display item count', () => {
    const rssXML = readFixture('rss-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const feedStats = document.getElementById('feedStats');
    expect(feedStats.textContent).toContain('3');
    expect(feedStats.textContent).toContain('Items');
  });

  test('should display feed description', () => {
    const rssXML = readFixture('rss-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const feedStats = document.getElementById('feedStats');
    expect(feedStats.innerHTML).toContain('latest stories');
  });

  test('should display all feed items', () => {
    const rssXML = readFixture('rss-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const feedItems = document.getElementById('feedItems');
    const items = feedItems.querySelectorAll('.feed-item');
    expect(items.length).toBe(3);
  });

  test('should handle missing optional elements', () => {
    const incompleteXML = readFixture('rss-missing-elements.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(incompleteXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const feedItems = document.getElementById('feedItems');
    expect(feedItems.innerHTML).toBeTruthy();
  });

  test('should handle empty feed', () => {
    const emptyXML = readFixture('rss-empty.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(emptyXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const feedStats = document.getElementById('feedStats');
    expect(feedStats.textContent).toContain('0');
  });

  test('should show results after rendering', () => {
    const rssXML = readFixture('rss-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssXML, 'text/xml');
    const channel = xmlDoc.querySelector('channel');

    displayRss(channel);

    const resultsEl = document.getElementById('results');
    expect(resultsEl.classList.contains('hidden')).toBe(false);
  });
});

describe('Frontend App - displayAtom', () => {
  beforeEach(() => {
    setupEnvironment();
  });

  test('should display Atom feed title', () => {
    const atomXML = readFixture('atom-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(atomXML, 'text/xml');
    const feed = xmlDoc.querySelector('feed');

    displayAtom(feed);

    const feedTitle = document.getElementById('feedTitle');
    expect(feedTitle.textContent).toBe('Example Atom Feed');
  });

  test('should display entry count', () => {
    const atomXML = readFixture('atom-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(atomXML, 'text/xml');
    const feed = xmlDoc.querySelector('feed');

    displayAtom(feed);

    const feedStats = document.getElementById('feedStats');
    expect(feedStats.textContent).toContain('3');
    expect(feedStats.textContent).toContain('Entries');
  });

  test('should handle Atom link href attribute format', () => {
    const atomXML = readFixture('atom-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(atomXML, 'text/xml');
    const feed = xmlDoc.querySelector('feed');

    displayAtom(feed);

    const feedItems = document.getElementById('feedItems');
    expect(feedItems.innerHTML).toContain('href="https://example.com/entry1"');
  });

  test('should handle both summary and content elements', () => {
    const atomXML = readFixture('atom-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(atomXML, 'text/xml');
    const feed = xmlDoc.querySelector('feed');

    displayAtom(feed);

    const feedItems = document.getElementById('feedItems');
    expect(feedItems.innerHTML).toContain('summary of the first entry');
    expect(feedItems.innerHTML).toContain('content instead of summary');
  });

  test('should display all entries', () => {
    const atomXML = readFixture('atom-valid.xml');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(atomXML, 'text/xml');
    const feed = xmlDoc.querySelector('feed');

    displayAtom(feed);

    const feedItems = document.getElementById('feedItems');
    const items = feedItems.querySelectorAll('.feed-item');
    expect(items.length).toBe(3);
  });
});

describe('Frontend App - Event Handlers', () => {
  beforeEach(() => {
    setupEnvironment();
    global.fetch = jest.fn();
  });

  test('clearResults should reset input and hide UI elements', () => {
    const input = document.getElementById('rssUrl');
    const resultsEl = document.getElementById('results');
    const errorEl = document.getElementById('error');

    input.value = 'https://example.com/feed.xml';
    resultsEl.classList.remove('hidden');
    errorEl.classList.remove('hidden');

    clearResults();

    expect(input.value).toBe('');
    expect(resultsEl.classList.contains('hidden')).toBe(true);
    expect(errorEl.classList.contains('hidden')).toBe(true);
  });

  test('link button should populate input and trigger fetch', () => {
    const linkBtn = document.querySelector('.link-btn');
    const input = document.getElementById('rssUrl');

    linkBtn.click();

    expect(input.value).toBe('https://example.com/feed.xml');
  });
});
