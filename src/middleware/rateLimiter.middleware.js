// In-memory sliding window rate limiter. No external dependencies.
// For multi-instance deployments, replace Map with Redis ZADD.

const requestLog = new Map();

// Prune stale entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestLog.entries()) {
    const fresh = timestamps.filter((t) => now - t < 60 * 60 * 1000);
    if (fresh.length === 0) requestLog.delete(key);
    else requestLog.set(key, fresh);
  }
}, 5 * 60 * 1000).unref();

function rateLimiter({ maxRequests = 60, windowMs = 60_000, keyPrefix = 'default' } = {}) {
  return (req, res, next) => {
    const userId = req.user?.id ?? req.ip;
    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();

    const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    requestLog.set(key, timestamps);

    const remaining = Math.max(0, maxRequests - timestamps.length);

    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': remaining,
    });

    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    }

    next();
  };
}

// ── Presets ────────────────────────────────────────────────────────────────────
// AI endpoints: 20 calls/min (LLM calls cost money)
const aiLimiter = rateLimiter({ maxRequests: 20, windowMs: 60_000, keyPrefix: 'ai' });

// Auth endpoints: 10 attempts/min (brute-force protection)
const authLimiter = rateLimiter({ maxRequests: 10, windowMs: 60_000, keyPrefix: 'auth' });

module.exports = { rateLimiter, aiLimiter, authLimiter };
