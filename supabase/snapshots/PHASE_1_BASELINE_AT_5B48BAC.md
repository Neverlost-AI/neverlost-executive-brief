# Phase 1 baseline snapshot

- Baseline commit: `5b48bacb9886cd2196c71a0bf93d01353eeef54d`
- Original migration: `supabase/migrations/202607240001_create_entries.sql`
- Original migration SHA-256: `1AB092F7B0264FFD6E9EF2286A8407626A2FF9815B5E4F69078EBDF80B925C9E`
- Snapshot date: 2026-07-26
- Data handling: schema was captured from the tracked Phase 1 migration. The companion fixture is synthetic and contains no production records or credentials.

## Phase 1 schema inventory

`public.entries` contains `id`, `user_id`, `title`, `content`, `category`, `priority`, `created_at`, `updated_at`, `reviewed_at`, and `archived_at`.

Row Level Security is enabled and forced. Separate owner-only select, insert, update, and delete policies apply to the `authenticated` role. The `anon` role has no table privileges.

The Phase 2A preservation test snapshots all ten Phase 1 columns before migration and compares them byte-for-byte after migration. The original migration remains unchanged.
