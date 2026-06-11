type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

export function rateLimit(
  req: Request,
  {
    key,
    limit,
    windowMs,
  }: {
    key: string;
    limit: number;
    windowMs: number;
  }
) {
  const now = Date.now();
  const bucketKey = `${key}:${getClientIp(req)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  current.count += 1;

  if (current.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfter: 0,
  };
}
