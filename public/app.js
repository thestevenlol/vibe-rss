// DOM Elements
const rssUrlInput = document.getElementById('rssUrl');
const fetchBtn = document.getElementById('fetchBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const feedTitleEl = document.getElementById('feedTitle');
const feedStatsEl = document.getElementById('feedStats');
const feedItemsEl = document.getElementById('feedItems');
const savedFeedsSection = document.getElementById('savedFeedsSection');
const savedFeedsList = document.getElementById('savedFeedsList');
const SAVED_FEEDS_KEY = 'savedRssFeeds';
const DARK_MODE_KEY = 'darkMode';

// Event Listeners
fetchBtn.addEventListener('click', fetchRssFeed);
saveBtn.addEventListener('click', saveCurrentFeed);
clearBtn.addEventListener('click', clearResults);
darkModeToggle.addEventListener('click', toggleDarkMode);

rssUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchRssFeed();
    }
});

initDarkMode();
renderSavedFeeds();

// Main Functions
async function fetchRssFeed() {
    const url = rssUrlInput.value.trim();

    if (!url) {
        showError('Please enter a valid RSS feed URL');
        return;
    }

    // Reset UI
    hideError();
    hideResults();
    showLoading();

    try {
        const response = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Check for XML parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Failed to parse RSS feed. Invalid XML format.');
        }

        displayFeed(xmlDoc);
    } catch (error) {
        showError(`Error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayFeed(xmlDoc) {
    // Try RSS 2.0 format first, then Atom
    const channel = xmlDoc.querySelector('channel');
    const feedEl = xmlDoc.querySelector('feed');

    if (channel) {
        displayRss(channel);
    } else if (feedEl) {
        displayAtom(feedEl);
    } else {
        showError('Unrecognized feed format. Please ensure the URL is a valid RSS or Atom feed.');
    }
}

function displayRss(channel) {
    const title = channel.querySelector('title')?.textContent || 'RSS Feed';
    const items = Array.from(channel.querySelectorAll('item'));

    feedTitleEl.textContent = title;

    // Display stats
    const link = channel.querySelector('link')?.textContent;
    const description = channel.querySelector('description')?.textContent;
    
    feedStatsEl.innerHTML = `
        <div>
            <strong>${items.length}</strong>
            <span>Items</span>
        </div>
        ${description ? `<div style="flex: 1"><span>${escapeHtml(description)}</span></div>` : ''}
    `;

    // Display items
    feedItemsEl.innerHTML = items.map(item => {
        const itemTitle = item.querySelector('title')?.textContent || 'Untitled';
        const itemLink = item.querySelector('link')?.textContent || '#';
        const itemDescription = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent;

        return `
            <div class="feed-item">
                <h3><a href="${escapeHtml(itemLink)}" target="_blank" rel="noopener">${escapeHtml(itemTitle)}</a></h3>
                <div class="meta">
                    ${pubDate ? `<span>📅 ${formatDate(pubDate)}</span>` : ''}
                </div>
                ${itemDescription ? `<div class="description">${stripHtml(itemDescription, 300)}</div>` : ''}
            </div>
        `;
    }).join('');

    showResults();
}

function displayAtom(feed) {
    const title = feed.querySelector('title')?.textContent || 'Atom Feed';
    const entries = Array.from(feed.querySelectorAll('entry'));

    feedTitleEl.textContent = title;

    // Display stats
    const subtitle = feed.querySelector('subtitle')?.textContent;
    
    feedStatsEl.innerHTML = `
        <div>
            <strong>${entries.length}</strong>
            <span>Entries</span>
        </div>
        ${subtitle ? `<div style="flex: 1"><span>${escapeHtml(subtitle)}</span></div>` : ''}
    `;

    // Display entries
    feedItemsEl.innerHTML = entries.map(entry => {
        const entryTitle = entry.querySelector('title')?.textContent || 'Untitled';
        const entryLink = entry.querySelector('link')?.getAttribute('href') || '#';
        const summary = entry.querySelector('summary')?.textContent || 
                       entry.querySelector('content')?.textContent || '';
        const updated = entry.querySelector('updated')?.textContent;

        return `
            <div class="feed-item">
                <h3><a href="${escapeHtml(entryLink)}" target="_blank" rel="noopener">${escapeHtml(entryTitle)}</a></h3>
                <div class="meta">
                    ${updated ? `<span>📅 ${formatDate(updated)}</span>` : ''}
                </div>
                ${summary ? `<div class="description">${stripHtml(summary, 300)}</div>` : ''}
            </div>
        `;
    }).join('');

    showResults();
}

// Utility Functions
function showLoading() {
    loadingEl.classList.remove('hidden');
}

function hideLoading() {
    loadingEl.classList.add('hidden');
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError() {
    errorEl.classList.add('hidden');
}

function showResults() {
    resultsEl.classList.remove('hidden');
}

function hideResults() {
    resultsEl.classList.add('hidden');
}

function clearResults() {
    rssUrlInput.value = '';
    hideResults();
    hideError();
}

function saveCurrentFeed() {
    const url = rssUrlInput.value.trim();

    if (!url || !isValidFeedUrl(url)) {
        showError('Please enter a valid RSS feed URL');
        return;
    }

    const savedFeeds = readSavedFeeds();
    if (savedFeeds.includes(url)) {
        showError('This feed is already saved.');
        return;
    }

    writeSavedFeeds([url, ...savedFeeds]);
    hideError();
    renderSavedFeeds();
}

function removeSavedFeed(urlToRemove) {
    const updatedFeeds = readSavedFeeds().filter((url) => url !== urlToRemove);
    writeSavedFeeds(updatedFeeds);
    renderSavedFeeds();
}

function renderSavedFeeds() {
    if (!savedFeedsSection || !savedFeedsList) {
        return;
    }

    const savedFeeds = readSavedFeeds();

    if (!savedFeeds.length) {
        savedFeedsSection.classList.add('hidden');
        savedFeedsList.innerHTML = '';
        return;
    }

    savedFeedsSection.classList.remove('hidden');
    savedFeedsList.innerHTML = savedFeeds.map((url) => {
        const encodedUrl = encodeURIComponent(url);
        return `
            <div class="saved-feed">
                <button type="button" class="saved-feed-link" data-url="${encodedUrl}">${escapeHtml(url)}</button>
                <button type="button" class="saved-feed-remove" data-url="${encodedUrl}">Remove</button>
            </div>
        `;
    }).join('');

    savedFeedsList.querySelectorAll('.saved-feed-link').forEach((button) => {
        button.addEventListener('click', () => {
            const url = decodeURIComponent(button.dataset.url || '');
            if (!url) {
                return;
            }
            rssUrlInput.value = url;
            fetchRssFeed();
        });
    });

    savedFeedsList.querySelectorAll('.saved-feed-remove').forEach((button) => {
        button.addEventListener('click', () => {
            const url = decodeURIComponent(button.dataset.url || '');
            if (!url) {
                return;
            }
            removeSavedFeed(url);
        });
    });
}

function readSavedFeeds() {
    try {
        const raw = localStorage.getItem(SAVED_FEEDS_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((url) => typeof url === 'string' && url.trim());
    } catch {
        return [];
    }
}

function writeSavedFeeds(feeds) {
    try {
        localStorage.setItem(SAVED_FEEDS_KEY, JSON.stringify(feeds));
    } catch {
        // Ignore storage failures so the rest of the UI still works.
    }
}

function isValidFeedUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function stripHtml(html, maxLength = 300) {
    const div = document.createElement('div');
    div.innerHTML = html;
    let text = div.textContent || div.innerText || '';
    
    if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...';
    }
    
    return escapeHtml(text);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function initDarkMode() {
    const isDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem(DARK_MODE_KEY, isDarkMode);
}
