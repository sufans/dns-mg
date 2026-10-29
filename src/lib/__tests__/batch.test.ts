import { describe, expect, it, vi } from 'vitest';
import { runWithConcurrency } from '../batch';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('runWithConcurrency', () => {
  it('returns immediately for an empty list', async () => {
    const run = vi.fn();
    await expect(runWithConcurrency([], 2, run)).resolves.toEqual({ ok: [], failed: [] });
    expect(run).not.toHaveBeenCalled();
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const gates = Array.from({ length: 5 }, deferred);
    const task = runWithConcurrency(
      [0, 1, 2, 3, 4],
      2,
      async (index) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await gates[index].promise;
        inFlight -= 1;
      }
    );

    // Let the first wave start, then release tasks one by one.
    await Promise.resolve();
    expect(peak).toBe(2);
    for (const gate of gates) gate.resolve();
    await task;
    expect(peak).toBe(2);
  });

  it('collects failures without stopping the remaining work, keeping input order', async () => {
    const outcome = await runWithConcurrency(['a', 'b', 'c'], 2, async (item) => {
      if (item === 'b') throw new Error('boom');
    });

    expect(outcome.ok).toEqual(['a', 'c']);
    expect(outcome.failed).toEqual([{ item: 'b', error: 'boom' }]);
  });

  it('reports progress up to the total', async () => {
    const seen: Array<[number, number]> = [];
    await runWithConcurrency([1, 2, 3], 2, async () => {}, (done, total) => seen.push([done, total]));

    expect(seen).toHaveLength(3);
    expect(seen.at(-1)).toEqual([3, 3]);
  });
});
