<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Data Safety Rule

**Any operation that could result in data loss in Supabase or any cloud storage must be confirmed with the user before proceeding.** This includes, but is not limited to:

- Dropping, truncating, or deleting tables, rows, columns, or databases
- Running destructive migrations (e.g., removing columns, changing types with potential data loss)
- Deleting files or buckets in cloud storage (Supabase Storage, S3, GCS, etc.)
- Overwriting existing data without a backup or rollback plan
- Resetting or seeding a database that already contains data
- Disabling or modifying RLS policies in a way that could expose or corrupt data

Always describe the exact operation and its impact, then wait for explicit user approval before executing.
