#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {
  BACKUP_TABLES,
  createSupabaseAdminClient,
  loadEnv,
} from './supabase-admin.mjs';

const PAGE_SIZE = 1000;

function parseArgs(argv) {
  let outPath = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out' || arg === '-o') {
      outPath = argv[i + 1] || null;
      i++;
    } else if (arg.startsWith('--out=')) {
      outPath = arg.slice('--out='.length);
    }
  }
  return { outPath };
}

async function fetchAllRows(client, tableName, orderBy) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .order(orderBy, { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed reading "${tableName}": ${error.message}`);
    }
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  const { outPath } = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const { client, projectRef, usingServiceRole } = createSupabaseAdminClient(env);

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const targetFile = path.resolve(
    process.cwd(),
    outPath || path.join('backups', `snooker-backup-${stamp}.json`)
  );

  console.log('--- Snooker Tracker: Supabase Backup ---');
  console.log(`Project: ${projectRef} (key: ${usingServiceRole ? 'service_role' : 'anon'})`);

  const tables = {};
  const counts = {};

  for (const { name, orderBy } of BACKUP_TABLES) {
    const rows = await fetchAllRows(client, name, orderBy);
    tables[name] = rows;
    counts[name] = rows.length;
    console.log(`  • ${name}: ${rows.length} rows`);
  }

  const payload = {
    version: 1,
    exportedAt: now.toISOString(),
    projectRef,
    counts,
    tables,
  };

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const relPath = path.relative(process.cwd(), targetFile) || targetFile;
  console.log(`✓ Backup saved to ${relPath}`);
}

main().catch((err) => {
  console.error(`Backup failed: ${err.message}`);
  process.exit(1);
});
