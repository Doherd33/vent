'use strict';

const config = require('../lib/config');

/**
 * middleware/error-handler.js
 *
 * Centralised Express error handler. Must be registered LAST with app.use().
 * Catches anything passed to next(err) anywhere in the route chain.
 *
 * Replaces the scattered try/catch+console.error+res.status(500) pattern
 * that currently exists in every route file.
 */

function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Always log the full error server-side
  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(err);
  } else {
    console.warn(`[WARN] ${status} ${req.method} ${req.originalUrl} — ${message}`);
  }

  // Never leak stack traces to clients in production
  const body = {
    error: message,
    ...(config.isDev && status >= 500 && { stack: err.stack }),
  };

  res.status(status).json(body);
}

module.exports = errorHandler;
