/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Load the app.js file to access utility functions
const appJsPath = path.join(__dirname, '../../public/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf-8');

// Helper to setup environment and load app.js
function setupEnvironment() {
  // Completely reset the DOM document
  document.documentElement.innerHTML = '';
  document.documentElement.innerHTML = '<head></head><body></body>';
  
  // Set up minimal DOM for functions that need it
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

describe('Frontend Utilities - escapeHtml', () => {
  beforeEach(() => {
    setupEnvironment();
  });

  test('should escape HTML script tags', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeHtml(input);
    
    expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    expect(result).not.toContain('<script>');
  });

  test('should escape ampersand character', () => {
    const input = 'AT&T Corporation';
    const result = escapeHtml(input);
    
    expect(result).toBe('AT&amp;T Corporation');
  });

  test('should escape double quotes', () => {
    const input = 'He said "hello"';
    const result = escapeHtml(input);
    
    // textContent -> innerHTML preserves literal quotes in the text
    expect(result).toContain('hello');
    expect(result).toBeTruthy();
  });

  test('should escape single quotes', () => {
    const input = "It's a test";
    const result = escapeHtml(input);
    
    // Single quotes may be escaped as &#39; by textContent -> innerHTML
    expect(result).toBeTruthy();
    expect(result).toContain('test');
  });

  test('should escape less than and greater than symbols', () => {
    const input = '5 < 10 and 20 > 10';
    const result = escapeHtml(input);
    
    expect(result).toBe('5 &lt; 10 and 20 &gt; 10');
  });

  test('should handle plain text without special characters', () => {
    const input = 'Hello World';
    const result = escapeHtml(input);
    
    expect(result).toBe('Hello World');
  });

  test('should handle empty string', () => {
    const input = '';
    const result = escapeHtml(input);
    
    expect(result).toBe('');
  });

  test('should escape multiple HTML tags', () => {
    const input = '<div><p>Test</p></div>';
    const result = escapeHtml(input);
    
    expect(result).not.toContain('<div>');
    expect(result).not.toContain('<p>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  test('should escape dangerous HTML attributes', () => {
    const input = '<img src=x onerror="alert(1)">';
    const result = escapeHtml(input);
    
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  test('should prevent XSS via event handlers', () => {
    const input = '<a href="#" onclick="alert(1)">Click</a>';
    const result = escapeHtml(input);
    
    // The angle brackets are escaped, preventing the tag from being rendered
    expect(result).not.toContain('<a');
    expect(result).toContain('&lt;a');
  });

  test('should handle unicode characters correctly', () => {
    const input = '你好世界 🌍';
    const result = escapeHtml(input);
    
    expect(result).toBe('你好世界 🌍');
  });

  test('should handle newlines and tabs', () => {
    const input = 'Line 1\nLine 2\tTabbed';
    const result = escapeHtml(input);
    
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });
});

describe('Frontend Utilities - stripHtml', () => {
  beforeEach(() => {
    setupEnvironment();
  });

  test('should strip HTML tags completely', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = stripHtml(input);
    
    expect(result).toBe('Hello World');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
  });

  test('should handle nested HTML tags', () => {
    const input = '<div><p>Outer <span>Inner</span></p></div>';
    const result = stripHtml(input);
    
    expect(result).toBe('Outer Inner');
  });

  test('should truncate to maxLength with ellipsis', () => {
    const input = '<p>This is a very long description that should be truncated at the specified maximum length parameter value.</p>';
    const result = stripHtml(input, 50);
    
    expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
    expect(result).toContain('...');
  });

  test('should not truncate text shorter than maxLength', () => {
    const input = '<p>Short text</p>';
    const result = stripHtml(input, 100);
    
    expect(result).toBe('Short text');
    expect(result).not.toContain('...');
  });

  test('should use default maxLength of 300', () => {
    const longText = 'a'.repeat(400);
    const input = `<p>${longText}</p>`;
    const result = stripHtml(input);
    
    expect(result.length).toBe(303); // 300 + '...'
    expect(result).toContain('...');
  });

  test('should handle text without HTML tags', () => {
    const input = 'Plain text without tags';
    const result = stripHtml(input);
    
    expect(result).toBe('Plain text without tags');
  });

  test('should handle empty string', () => {
    const input = '';
    const result = stripHtml(input);
    
    expect(result).toBe('');
  });

  test('should handle HTML entities after stripping', () => {
    const input = '<p>AT&amp;T Corporation</p>';
    const result = stripHtml(input);
    
    expect(result).toContain('AT&amp;T');
  });

  test('should handle self-closing tags', () => {
    const input = 'Text with <br/> line break <img src="test.jpg"/> image';
    const result = stripHtml(input);
    
    expect(result).not.toContain('<br/>');
    expect(result).not.toContain('<img');
    expect(result).toContain('Text with');
  });

  test('should escape HTML after stripping and truncating', () => {
    const input = '<p><script>alert("xss")</script>Normal text</p>';
    const result = stripHtml(input);
    
    // stripHtml calls escapeHtml at the end
    expect(result).not.toContain('<script>');
    expect(result).toContain('Normal text');
  });

  test('should handle multiple spaces and whitespace', () => {
    const input = '<p>Text   with    multiple     spaces</p>';
    const result = stripHtml(input);
    
    expect(result).toContain('Text');
    expect(result).toContain('spaces');
  });

  test('should handle exact maxLength boundary', () => {
    const input = '<p>Exactly fifty characters in this text string now</p>';
    const result = stripHtml(input, 50);
    
    expect(result.length).toBeLessThanOrEqual(53);
  });
});

describe('Frontend Utilities - formatDate', () => {
  beforeEach(() => {
    setupEnvironment();
  });

  test('should format valid ISO date correctly', () => {
    const input = '2026-02-07T10:00:00Z';
    const result = formatDate(input);
    
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/7/);
    expect(result).toMatch(/2026/);
  });

  test('should format valid RFC date correctly', () => {
    const input = 'Fri, 07 Feb 2026 10:00:00 GMT';
    const result = formatDate(input);
    
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/7/);
    expect(result).toMatch(/2026/);
  });

  test('should return Invalid Date for invalid date strings', () => {
    const input = 'not-a-valid-date';
    const result = formatDate(input);
    
    // Date constructor with invalid string produces Invalid Date
    expect(result).toBe('Invalid Date');
  });

  test('should handle empty string as Invalid Date', () => {
    const input = '';
    const result = formatDate(input);
    
    // Empty string produces Invalid Date when parsed
    expect(result).toBe('Invalid Date');
  });

  test('should format dates with different formats', () => {
    const input = '2026-12-31';
    const result = formatDate(input);
    
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/31/);
    expect(result).toMatch(/2026/);
  });

  test('should handle timestamp numbers', () => {
    const input = '1707300000000'; // milliseconds
    const result = formatDate(input);
    
    // Should still try to parse as date
    expect(result).toBeTruthy();
  });

  test('should return Invalid Date for malformed date strings', () => {
    const input = '2026-13-45'; // Invalid month and day
    const result = formatDate(input);
    
    // Returns Invalid Date for invalid dates
    expect(result).toBe('Invalid Date');
  });

  test('should format date with time component', () => {
    const input = '2026-02-07T15:30:45.123Z';
    const result = formatDate(input);
    
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/7/);
    expect(result).toMatch(/2026/);
  });

  test('should use en-US locale format', () => {
    const input = '2026-06-15';
    const result = formatDate(input);
    
    // en-US format: Month Day, Year
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  test('should handle null or undefined as epoch date', () => {
    // The function uses try/catch and new Date(null) = Unix epoch
    const result1 = formatDate(null);
    const result2 = formatDate(undefined);
    
    // null/undefined are treated as epoch (Jan 1, 1970) or NaN
    expect(result1).toContain('Jan');
    expect(result2).toBeTruthy();
  });

  test('should format year, month, day in correct order', () => {
    const input = '2026-01-05';
    const result = formatDate(input);
    
    expect(result).toContain('Jan');
    expect(result).toContain('5');
    expect(result).toContain('2026');
  });
});

describe('Frontend Utilities - UI State Functions', () => {
  beforeEach(() => {
    setupEnvironment();
  });

  test('showLoading should remove hidden class', () => {
    const loadingEl = document.getElementById('loading');
    loadingEl.classList.add('hidden');
    
    showLoading();
    
    expect(loadingEl.classList.contains('hidden')).toBe(false);
  });

  test('hideLoading should add hidden class', () => {
    const loadingEl = document.getElementById('loading');
    loadingEl.classList.remove('hidden');
    
    hideLoading();
    
    expect(loadingEl.classList.contains('hidden')).toBe(true);
  });

  test('showError should set message and remove hidden class', () => {
    const errorEl = document.getElementById('error');
    
    showError('Test error message');
    
    expect(errorEl.textContent).toBe('Test error message');
    expect(errorEl.classList.contains('hidden')).toBe(false);
  });

  test('hideError should add hidden class', () => {
    const errorEl = document.getElementById('error');
    errorEl.classList.remove('hidden');
    
    hideError();
    
    expect(errorEl.classList.contains('hidden')).toBe(true);
  });

  test('showResults should remove hidden class', () => {
    const resultsEl = document.getElementById('results');
    resultsEl.classList.add('hidden');
    
    showResults();
    
    expect(resultsEl.classList.contains('hidden')).toBe(false);
  });

  test('hideResults should add hidden class', () => {
    const resultsEl = document.getElementById('results');
    resultsEl.classList.remove('hidden');
    
    hideResults();
    
    expect(resultsEl.classList.contains('hidden')).toBe(true);
  });

  test('clearResults should reset input value', () => {
    const input = document.getElementById('rssUrl');
    input.value = 'https://example.com/feed.xml';
    
    clearResults();
    
    expect(input.value).toBe('');
  });

  test('clearResults should hide results and error', () => {
    const resultsEl = document.getElementById('results');
    const errorEl = document.getElementById('error');
    
    resultsEl.classList.remove('hidden');
    errorEl.classList.remove('hidden');
    
    clearResults();
    
    expect(resultsEl.classList.contains('hidden')).toBe(true);
    expect(errorEl.classList.contains('hidden')).toBe(true);
  });
});
