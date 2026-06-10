import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  const sqlPath = join(__dirname, '0001_init.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // In Cloudflare Workers, this would be:
  // await env.DB.exec(sql);
  //
  // For local development with wrangler:
  // npx wrangler d1 execute dns-manager-db --local --file=migrations/0001_init.sql
  //
  // This script can be used with the D1 HTTP API or as a reference

  console.log('Migration SQL loaded from:', sqlPath);
  console.log('---');
  console.log('To apply this migration locally, run:');
  console.log('  npx wrangler d1 execute dns-manager-db --local --file=migrations/0001_init.sql');
  console.log('');
  console.log('To apply to production, run:');
  console.log('  npx wrangler d1 execute dns-manager-db --remote --file=migrations/0001_init.sql');
  console.log('---');
  console.log('SQL content:');
  console.log(sql);
}

applyMigration().catch((err) => {
  console.error('Failed to apply migration:', err);
  process.exit(1);
});
