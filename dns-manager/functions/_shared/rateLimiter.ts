// Simple in-memory rate limiter for Workers runtime
// Since Workers are stateless per-request, we use a simple approach:
// - Track request timestamps in a module-level Map
// - Check if the rate limit is exceeded before making requests
// Note: In production with multiple instances, this is approximate

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  let entry = rateLimits.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    rateLimits.set(key, entry);
  }

  // Clean up old timestamps outside the window
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    return false; // Rate limited
  }

  entry.timestamps.push(now);
  return true; // Request allowed
}

export async function waitForRateLimit(key: string, maxRequests: number, windowMs: number): Promise<void> {
  const maxWaitMs = 30_000; // Maximum wait time: 30 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (checkRateLimit(key, maxRequests, windowMs)) {
      return;
    }
    // Wait 500ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // If we've waited too long, force allow the request
  // (better to be slow than to fail entirely)
  const entry = rateLimits.get(key);
  if (entry) {
    entry.timestamps.push(Date.now());
  }
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
