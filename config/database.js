/**
 * @fileoverview Database configuration.
 *
 * NOTE: server.js connects to MongoDB directly via process.env.MONGODB_URI —
 * this module is NOT imported by server.js but is kept here for any external
 * scripts that may need programmatic access to the connection string.
 *
 * Previously referenced MONGODB_URI1 (a typo). Fixed to MONGODB_URI.
 */

module.exports = {
  mongoURI: process.env.MONGODB_URI,
};
