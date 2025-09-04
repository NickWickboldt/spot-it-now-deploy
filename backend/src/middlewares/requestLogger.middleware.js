import { log } from '../utils/logger.util.js';

// Logs each incoming request and its outcome.
export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const userId = req.user?._id || null;
  const { method, originalUrl } = req;
  const ip = req.headers['x-forwarded-for'] || req.ip;

  // Log request start
  log.route('backend-route', `Incoming ${method} ${originalUrl}`, {
    ip,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    },
    query: req.query,
    params: req.params,
  }, userId);

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    log.info('backend-route', `Completed ${method} ${originalUrl} ${res.statusCode}`, {
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      contentLength: res.getHeader('content-length') || null,
    }, userId);
  });

  next();
};

