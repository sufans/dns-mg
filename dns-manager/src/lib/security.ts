const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const HTML_ENTITY_REGEX = /[&<>"'/]/g;

function sanitizeInput(input: string): string {
  return input.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITY_MAP[char] || char);
}

function validateCSRFToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // CSRF token should be a non-empty alphanumeric string with possible dashes/underscores
  return /^[a-zA-Z0-9_-]+$/.test(token) && token.length >= 16 && token.length <= 256;
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Only allow http, https, and relative URLs
  if (/^https?:\/\//i.test(trimmed) || /^\//.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export { sanitizeInput, validateCSRFToken, sanitizeUrl, stripHtmlTags };
