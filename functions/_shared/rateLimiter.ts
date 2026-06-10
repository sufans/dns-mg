// Simple in-memory rate limiter for Workers runtime
// Since Workers are stateless per-request, we use a simple approach:
// - Track request timestamps in a module-level Map
// - Check if the rate limit is exceeded before making requests
// Note: In production with multiple instances, this is approximate.
// The Map is per-isolate and may be lost when the isolate is evicted.

interface RateLimitEntry {
  timestamps: number[];
}

const MAX_ENTRIES = 10000;
const rateLimits = new Map<string, RateLimitEntry>();

function evictStaleEntries(): void {
  if (rateLimits.size <= MAX_ENTRIES) return;

  // Remove entries with the oldest last timestamp
  const entries = [...rateLimits.entries()];
  entries.sort((a, b) => {
    const aLast = a[1].timestamps[a[1].timestamps.length - 1] ?? 0;
    const bLast = b[1].timestamps[b[1].timestamps.length - 1] ?? 0;
    return aLast - bLast;
  });

  const toDelete = entries.slice(0, Math.floor(MAX_ENTRIES / 10));
  for (const [key] of toDelete) {
    rateLimits.delete(key);
  }
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const entry = rateLimits.get(key);
  const timestamps = entry
    ? entry.timestamps.filter((t) => t > windowStart)
    : [];

  // Remove entry from Map if no recent timestamps
  if (entry && timestamps.length === 0) {
    rateLimits.delete(key);
  }

  if (timestamps.length >= maxRequests) {
    if (entry) {
      entry.timestamps = timestamps;
    }
    return false; // Rate limited
  }

  timestamps.push(now);
  rateLimits.set(key, { timestamps });

  evictStaleEntries();
  return true; // Request allowed
}

export async function waitForRateLimit(key: string, maxRequests: number, windowMs: number): Promise<void> {
  const maxWaitMs = 10_000; // Maximum wait time: 10 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (checkRateLimit(key, maxRequests, windowMs)) {
      return;
    }
    // Wait 500ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // If we've waited too long, reject rather than force-allow
  // Force-allowing defeats the purpose of rate limiting
  throw new Error('Rate limit wait timeout exceeded');
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error) {
        const msg = error.message;
        // Check for HTTP 4xx patterns in error messages
        if (/HTTP error: 4\d{2}/.test(msg)) {
          throw error;
        }
        // Check for API-level client errors (e.g. validation errors)
        if (/validation|invalid|bad request/i.test(msg)) {
          throw error;
        }
      }

      // Don't retry if this was the last attempt
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate exponential backoff delay with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
