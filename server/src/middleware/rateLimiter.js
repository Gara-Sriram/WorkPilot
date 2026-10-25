// Lightweight sliding-window rate limiter per client IP
const requestCounts = new Map();

export function rateLimiter({ windowMs = 60000, max = 60, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'anonymous';
    const now = Date.now();

    const clientData = requestCounts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count += 1;
    }

    requestCounts.set(ip, clientData);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientData.count));

    if (clientData.count > max) {
      return res.status(429).json({
        error: message,
        retryAfterMs: clientData.resetTime - now,
      });
    }

    next();
  };
}
