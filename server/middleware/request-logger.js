'use strict';

const config = require('../lib/config');

/**
 * middleware/request-logger.js
 *
 * Structured request logging. In dev: coloured one-liner per request.
 * In prod: JSON-friendly format that log aggregators can parse.
 */

const SKIP_PATHS = new Set(['/health']);

function requestLogger(req, res, next) {
  // Skip noisy keep-alive health pings
  if (SKIP_PATHS.has(req.path)) return next();

  const start = Date.now();

  res.on('finish', () => {
    const ms      = Date.now() - start;
    const status  = res.statusCode;
    const method  = req.method.padEnd(6);
    const path    = req.originalUrl;
    const user    = req.user ? req.user.email || req.user.id : 'anon';

    if (config.isDev) {
      const colour = status >= 500 ? '\x1b[31m'   // red
                   : status >= 400 ? '\x1b[33m'   // yellow
                   : status >= 300 ? '\x1b[36m'   // cyan
                   :                 '\x1b[32m';  // green
      console.log(`${colour}${status}\x1b[0m ${method} ${path} \x1b[2m${ms}ms · ${user}\x1b[0m`);
    } else {
      console.log(JSON.stringify({ ts: new Date().toISOString(), status, method: req.method, path, ms, user }));
    }
  });

  next();
}

module.exports = requestLogger;
