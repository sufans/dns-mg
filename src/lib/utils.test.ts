import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const flag1 = false;
    const flag2 = true;
    expect(cn('foo', flag1 && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', flag2 && 'bar', 'baz')).toBe('foo bar baz');
    expect(cn('foo', undefined, null, 'baz')).toBe('foo baz');
  });

  it('deduplicates tailwind classes', () => {
    // tailwind-merge should resolve conflicting classes
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(undefined, null, false)).toBe('');
  });
});
