import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('merges tailwind classes correctly (deduplication)', () => {
    // twMerge should deduplicate conflicting tailwind classes
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges conflicting responsive classes', () => {
    expect(cn('text-sm', 'md:text-lg')).toBe('text-sm md:text-lg');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('deduplicates conflicting padding classes', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('keeps non-conflicting classes', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });
});
