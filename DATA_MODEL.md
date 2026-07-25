# Data Model

## `entries`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key; generated with `gen_random_uuid()` |
| `user_id` | UUID | Required; references `auth.users(id)` with cascade delete |
| `title` | text | Required; trimmed length 1–160 |
| `content` | text | Required; trimmed length 1–20,000 |
| `category` | text | `note`, `decision`, `follow_up`, `reference`, or `personal` |
| `priority` | text | `low`, `normal`, or `high` |
| `created_at` | timestamptz | Required; defaults to current time |
| `updated_at` | timestamptz | Required; maintained by trigger |
| `reviewed_at` | timestamptz | Null until explicitly reviewed |
| `archived_at` | timestamptz | Null until explicitly archived |

## Ownership

`user_id` is always derived from the authenticated JWT on the application server. RLS applies `auth.uid() = user_id` to every select, insert, update, and delete operation. No query is authorized solely by application filtering.

## Ordering

The active brief excludes archived rows. Unreviewed entries sort before reviewed entries. Within each group, newest `created_at` sorts first.

## State transitions

- Review: set `reviewed_at` to the current timestamp.
- Restore to unreviewed: set `reviewed_at` to null.
- Archive: set `archived_at` to the current timestamp.
- Restore from archive: set `archived_at` to null.
- Delete: permanently delete after user confirmation.
