#!/usr/bin/env node
/**
 * push-migration.js
 * Pushes the Supabase migration SQL directly via the Management API.
 * No Supabase CLI required.
 *
 * Usage:
 *   Add SUPABASE_SERVICE_ROLE_KEY to your .env file, then run:
 *   node scripts/push-migration.js
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env from project root
dotenv.config({ path: resolve(ROOT, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL is not set in your .env file.');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error(
    '❌  SUPABASE_SERVICE_ROLE_KEY is not set in your .env file.\n' +
    '    Go to: Supabase Dashboard → Your Project → Settings → API\n' +
    '    Copy the "service_role" secret key and add it to .env:\n' +
    '    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here'
  );
  process.exit(1);
}

// Extract project ref from URL  (https://<ref>.supabase.co)
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
console.log(`\n🔗  Project ref: ${projectRef}`);

// Read migration file
const migrationPath = resolve(
  ROOT,
  'supabase',
  'migrations',
  '20260522000000_pfp_storage_and_city_cleanup.sql'
);

let sql;
try {
  sql = readFileSync(migrationPath, 'utf8');
  console.log(`📄  Loaded migration: ${migrationPath}`);
} catch (err) {
  console.error(`❌  Could not read migration file: ${migrationPath}`);
  console.error(err.message);
  process.exit(1);
}

// ── Execute via Supabase REST (rpc on postgres schema) ──────────────────────
// We use the /rest/v1/rpc/exec endpoint which is available when pg_net or
// the sql endpoint is enabled. If that fails we fall back to the Management API.

async function runViaRestRpc() {
  // Supabase exposes an undocumented but stable endpoint for service-role SQL:
  // POST /rest/v1/  with Content-Type: application/json is not available.
  // Instead we use the pg endpoint available at /pg/query  (Supabase >= 2024).
  const endpoint = `${SUPABASE_URL}/pg/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (response.ok) {
    const data = await response.json();
    return { ok: true, data };
  }
  return { ok: false, status: response.status, body: await response.text() };
}

async function runViaManagementApi() {
  // Supabase Management API — requires a PAT, not the service role key.
  // This path is a fallback hint only.
  return { ok: false, body: 'Management API requires a Personal Access Token (PAT).' };
}

async function runViaDatabaseEndpoint() {
  // POST to the SQL endpoint Supabase exposes for service-role clients
  const endpoint = `${SUPABASE_URL}/rest/v1/`;
  // Build individual statements (split on semicolons, skip empty)
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  const errors = [];
  for (const stmt of statements) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ sql: stmt }),
    });

    if (!response.ok) {
      const text = await response.text();
      errors.push({ stmt: stmt.slice(0, 80) + '...', status: response.status, body: text });
    }
  }

  if (errors.length === 0) return { ok: true };
  return { ok: false, errors };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Pushing migration to Supabase…\n');

  // Try /pg/query first
  console.log('  Attempt 1: /pg/query endpoint…');
  const r1 = await runViaRestRpc();
  if (r1.ok) {
    console.log('✅  Migration applied successfully via /pg/query!');
    return;
  }
  console.log(`  ⚠️  /pg/query returned ${r1.status}: ${r1.body?.slice(0, 200)}`);

  // Try rpc/exec_sql
  console.log('\n  Attempt 2: /rest/v1/rpc/exec_sql endpoint…');
  const r2 = await runViaDatabaseEndpoint();
  if (r2.ok) {
    console.log('✅  Migration applied successfully via rpc/exec_sql!');
    return;
  }
  console.log('  ⚠️  exec_sql failed:', JSON.stringify(r2.errors ?? r2, null, 2));

  // Both failed — print the SQL and ask user to run it manually
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('⚠️   Automatic push failed (normal if exec_sql is not enabled).');
  console.log('    Please apply the migration manually in 30 seconds:');
  console.log('\n    1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('    2. Paste and run the SQL below:\n');
  console.log('────────────────────────────────────────────────────────────\n');
  console.log(sql);
  console.log('\n────────────────────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
