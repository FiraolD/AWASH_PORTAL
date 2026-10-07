const buckets = new Map();
export function apiRateLimiter(options = {}) {
    const windowMs = options.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
    const maxRequests = options.maxRequests ?? Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 300);
    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 1, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        else {
            bucket.count += 1;
        }
        res.setHeader('RateLimit-Limit', maxRequests.toString());
        res.setHeader('RateLimit-Remaining', Math.max(maxRequests - bucket.count, 0).toString());
        res.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000).toString());
        if (bucket.count > maxRequests) {
            res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000).toString());
            return res.status(429).json({ error: 'Too many requests, please try again later' });
        }
        return next();
    };
}
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
}, 60 * 1000).unref();
