/**
 * @fileoverview Lightweight logger — debug only fires in development.
 * In production (NODE_ENV=production) debug() is a no-op.
 * Errors and warnings always surface regardless of environment.
 */

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  /** Only logs in development. Use for tracing / step-by-step narration. */
  debug: (...args) => { if (isDev) console.log(...args); },
  /** Always logs. Use for significant state changes worth knowing in production. */
  info:  (...args) => console.info(...args),
  /** Always logs. Use for recoverable problems. */
  warn:  (...args) => console.warn(...args),
  /** Always logs. Use for caught errors. */
  error: (...args) => console.error(...args),
};
