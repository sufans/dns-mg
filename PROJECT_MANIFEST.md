# Project Manifest

Generated on 2026-06-10.

Validation performed locally in the sandbox:

```bash
npm ci --ignore-scripts --loglevel=error
npm run typecheck
npm run lint
npm run build
```

All validation commands passed before packaging.

Key implementation files:

- `functions/_shared/auth.ts`: JWT + CSRF + second verification helpers.
- `functions/_shared/crypto.ts`: AES-GCM encrypted storage for API account configs.
- `functions/_shared/platforms/dnshe.ts`: DNSHE V2 adapter.
- `functions/_shared/platforms/dnsneko.ts`: DNSNEKO adapter.
- `functions/api/*`: Pages Functions REST API.
- `src/pages/*`: React admin console pages.
- `d1/schema.sql`: D1 database schema.
- `docs/*`: deployment, API, security, adapter, troubleshooting docs.
