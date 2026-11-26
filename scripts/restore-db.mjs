#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import {
  BACKUP_TABLES,
  createSupabaseAdminClient,
  loadEnv,
} from './supabase-admin.mjs';

const BATCH_SIZE = 500;

function parseArgs(argv) {
  let filePath = null;
  let yes = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') {
      yes = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--file' || arg === '-f') {
      filePath = argv[i + 1] || null;
      i++;
    } else if (arg.startsWith('--file=')) {
      filePath = arg.slice('--file='.length);
    } else if (!arg.startsWith('-') && !filePath) {
      filePath = arg;
    }
  }

  return { filePath, yes, dryRun };
}

function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function upsertTable(client, tableName, rows, usingServiceRole) {
  // Without service_role, `breaks` only has INSERT/SELECT RLS (no UPDATE policy),
  // so use ignoreDuplicates to avoid failing on pre-existing break IDs.
  const ignoreDuplicates = !usingServiceRole && tableName === 'breaks';

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await client
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates });

    if (error) {
      throw new Error(`Failed restoring "${tableName}" (batch ${i}): ${error.message}`);
    }
  }
}

async function main() {
  const { filePath, yes, dryRun } = parseArgs(process.argv.slice(2));
  if (!filePath) {
    console.error('Usage: npm run db:restore -- --file backups/<snapshot>.json [--dry-run] [--yes]');
    process.exit(1);
  }

  const resolvedFile = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedFile)) {
    throw new Error(`Backup file not found: ${resolvedFile}`);
  }

  const backup = JSON.parse(fs.readFileSync(resolvedFile, 'utf8'));
  if (!backup || typeof backup !== 'object' || !backup.tables) {
    throw new Error('Invalid backup format: missing "tables" object.');
  }

  const env = loadEnv();
  const { client, projectRef, usingServiceRole } = createSupabaseAdminClient(env);

  console.log('--- Snooker Tracker: Supabase Restore ---');
  console.log(`Target project: ${projectRef} (key: ${usingServiceRole ? 'service_role' : 'anon'})`);
  console.log(`Backup file:    ${path.relative(process.cwd(), resolvedFile)}`);
  console.log(`Exported at:    ${backup.exportedAt || 'unknown'}`);

  for (const { name } of BACKUP_TABLES) {
    const rows = Array.isArray(backup.tables[name]) ? backup.tables[name] : [];
    console.log(`  • ${name}: ${rows.length} rows to upsert`);
  }

  if (dryRun) {
    console.log('Dry run complete. No database changes were made.');
    return;
  }

  if (!yes) {
    if (!process.stdin.isTTY) {
      throw new Error('Non-interactive shell: pass --yes to confirm upserting backup data.');
    }
    const confirmed = await askConfirmation(
      '\nThis will upsert backup rows (overwriting matching IDs) into Supabase. Type "yes" to continue: '
    );
    if (!confirmed) {
      console.log('Restore cancelled.');
      return;
    }
  }

  for (const { name } of BACKUP_TABLES) {
    const rows = Array.isArray(backup.tables[name]) ? backup.tables[name] : [];
    if (rows.length === 0) continue;
    await upsertTable(client, name, rows, usingServiceRole);
    console.log(`  ✓ Restored ${rows.length} rows into ${name}`);
  }

  console.log('✓ Restore complete.');
}

main().catch((err) => {
  console.error(`Restore failed: ${err.message}`);
  process.exit(1);
});
