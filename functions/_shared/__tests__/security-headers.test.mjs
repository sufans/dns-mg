import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Kept as plain JS: this guards static files and must not pull Node types into
// the Cloudflare Workers TypeScript project.
const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const headersFile = readFileSync(join(root, 'public', '_headers'), 'utf8');

/** HTML parsers normalise CRLF to LF before CSP hashes the script text. */
function inlineScriptHashes(source) {
  const matches = source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi);
  return [...matches].map((match) => `sha256-${createHash('sha256').update(match[1].replace(/\r\n/g, '\n'), 'utf8').digest('base64')}`);
}

describe('static security headers', () => {
  it('ships a _headers file, because _routes.json only routes /api/* through Functions', () => {
    expect(headersFile).toContain('Content-Security-Policy:');
    expect(headersFile).toContain('X-Frame-Options: DENY');
    expect(headersFile).toContain('X-Content-Type-Options: nosniff');
  });

  it('allows the inline theme bootstrap by hash instead of enabling unsafe-inline scripts', () => {
    const hashes = inlineScriptHashes(html);
    expect(hashes).toHaveLength(1);
    const csp = headersFile.split('\n').find((line) => line.includes('Content-Security-Policy:')) ?? '';
    expect(csp).toContain(`'${hashes[0]}'`);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
