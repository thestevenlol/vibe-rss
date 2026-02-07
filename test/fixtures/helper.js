const fs = require('fs');
const path = require('path');

/**
 * Helper function to load XML fixture files for testing
 * @param {string} filename - Name of the fixture file (e.g., 'rss-valid.xml')
 * @returns {string} Contents of the fixture file
 */
function readFixture(filename) {
  const filePath = path.join(__dirname, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

module.exports = { readFixture };
