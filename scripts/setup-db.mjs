#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load .env
const envFile = path.resolve(process.cwd(), '.env');
const env = { ...process.env };
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (!env[key]) env[key] = val;
    }
  }
}

const PROJECT_REF = env.NEXT_PUBLIC_SUPABASE_URL
  ? env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '').split('/')[0]
  : 'jglobttiyojuzhrdubkt';

const token = env.SUPABASE_ACCESS_TOKEN;
const dbUrl = env.DATABASE_URL;

console.log('--- Snooker Tracker: Supabase Setup Script ---');
console.log(`Target Project: ${PROJECT_REF}`);

if (token) {
  console.log('Found SUPABASE_ACCESS_TOKEN. Applying schema and seed via Supabase CLI...');
  try {
    console.log('Running schema.sql...');
    execSync(`npx supabase db query --file supabase/schema.sql --remote=${PROJECT_REF} --yes`, {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    });
    console.log('Running seed.sql...');
    execSync(`npx supabase db query --file supabase/seed.sql --remote=${PROJECT_REF} --yes`, {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    });
    console.log('✓ Successfully applied all Supabase scripts!');
    process.exit(0);
  } catch (err) {
    console.error('Failed applying scripts via Supabase access token:', err.message);
    process.exit(1);
  }
} else if (dbUrl) {
  console.log('Found DATABASE_URL. Applying schema and seed via direct database connection...');
  try {
    console.log('Running schema.sql...');
    execSync(`npx supabase db query --file supabase/schema.sql --remote="${dbUrl}" --yes`, {
      stdio: 'inherit',
    });
    console.log('Running seed.sql...');
    execSync(`npx supabase db query --file supabase/seed.sql --remote="${dbUrl}" --yes`, {
      stdio: 'inherit',
    });
    console.log('✓ Successfully applied all Supabase scripts!');
    process.exit(0);
  } catch (err) {
    console.error('Failed applying scripts via DATABASE_URL:', err.message);
    process.exit(1);
  }
} else {
  console.log('\nTo execute SQL directly from the CLI on your hosted Supabase database, authentication is required.');
  console.log('Please choose ONE of the following:');
  console.log('\nOption 1: Supabase Personal Access Token');
  console.log('  1. Generate a token at: https://supabase.com/dashboard/account/tokens');
  console.log('  2. Run:');
  console.log('     SUPABASE_ACCESS_TOKEN=sbp_... npm run db:setup\n');
  console.log('Option 2: Database Connection String');
  console.log('  1. Get connection string from: Supabase Dashboard -> Project Settings -> Database');
  console.log('  2. Run:');
  console.log('     DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" npm run db:setup\n');
  process.exit(1);
}
