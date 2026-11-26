import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/** Tables in foreign-key dependency order (parents before children). */
export const BACKUP_TABLES = [
  { name: 'players', orderBy: 'created_at' },
  { name: 'matches', orderBy: 'started_at' },
  { name: 'frames', orderBy: 'started_at' },
  { name: 'breaks', orderBy: 'created_at' },
];

/**
 * Loads environment variables from .env.local and .env without overriding
 * variables already present in process.env.
 */
export function loadEnv() {
  const env = { ...process.env };
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      const key = match[1];
      let val = match[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!env[key]) env[key] = val;
    }
  }
  return env;
}

function getJwtProjectRef(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

/**
 * Creates a Supabase client using service role key (when it matches the URL project ref)
 * or falls back to the anon key.
 */
export function createSupabaseAdminClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || url.includes('your-project-id')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing or still set to placeholder.');
  }

  const projectRef = url.replace(/^https?:\/\//, '').split('.')[0] || 'unknown';
  const serviceRef = serviceKey ? getJwtProjectRef(serviceKey) : null;
  const serviceKeyMatches = Boolean(serviceKey && (!serviceRef || serviceRef === projectRef));

  if (serviceKey && !serviceKeyMatches && anonKey) {
    console.warn(
      `Note: SUPABASE_SERVICE_ROLE_KEY belongs to project "${serviceRef}", not "${projectRef}". Using NEXT_PUBLIC_SUPABASE_ANON_KEY instead.`
    );
  }

  const useServiceRole = serviceKeyMatches;
  const key = useServiceRole ? serviceKey : anonKey;

  if (!key) {
    throw new Error('Missing valid SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    client,
    projectRef,
    usingServiceRole: useServiceRole,
  };
}
