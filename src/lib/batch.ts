export interface BatchFailure<T> {
  item: T;
  error: string;
}

export interface BatchOutcome<T> {
  ok: T[];
  failed: Array<BatchFailure<T>>;
}

/**
 * Runs `run` over `items` with a bounded number of in-flight calls.
 *
 * Platforms without an official batch endpoint are driven one record at a time,
 * and every call consumes an upstream quota slot, so the default limit is small.
 * Results keep input order to make progress and error reporting deterministic.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<void>,
  onProgress?: (done: number, total: number) => void
): Promise<BatchOutcome<T>> {
  const total = items.length;
  const ok: T[] = [];
  const failed: Array<BatchFailure<T>> = [];
  if (total === 0) return { ok, failed };

  const results: Array<{ item: T; error: string | null }> = new Array(total);
  const width = Math.min(Math.max(1, Math.floor(limit)), total);
  let cursor = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (cursor < total) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      let error: string | null = null;
      try {
        await run(item);
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
      }
      results[index] = { item, error };
      done += 1;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: width }, worker));

  for (const result of results) {
    if (result.error === null) ok.push(result.item);
    else failed.push({ item: result.item, error: result.error });
  }
  return { ok, failed };
}
