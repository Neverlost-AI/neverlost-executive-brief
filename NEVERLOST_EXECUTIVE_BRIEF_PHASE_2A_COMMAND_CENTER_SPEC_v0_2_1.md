# Neverlost Executive Brief
## Phase 2A - Manual Workstream Command Center Specification v0.2.1

**Status:** `READY_FOR_HUMAN_REVIEW`  
**Phase 1 baseline:** `PHASE_1_MANUAL_CROSS_DEVICE_MVP_HUMAN_ACCEPTED`  
**Required implementation baseline:** `5b48bacb9886cd2196c71a0bf93d01353eeef54d`  
**Owner:** Jeff Summerhays  
**Specification date:** July 26, 2026  
**Product timezone:** `America/Denver`  
**Supersedes:** `NEVERLOST_EXECUTIVE_BRIEF_PHASE_2A_COMMAND_CENTER_SPEC_v0_2.md`

**Delivery boundary:** Reconciled specification only. No migration, application code, deployment, or production-data change is authorized by this document.

---

## 1. Executive Decision

The next bounded candidate release is **Phase 2A: Manual Workstream Command Center**.

Phase 1 proved the secure cross-device continuity loop: an entry captured on one device can be preserved, recovered, reviewed, edited, archived, restored, and deleted from another device by the same authenticated owner.

Phase 2A may add a manual command layer without replacing that accepted workflow. It should answer:

- What needs triage?
- Which workstreams are active?
- What is the next action?
- What is waiting or blocked?
- Which workstreams are at risk or stale?
- What decision was made?
- What needs deliberate review now?

The Phase 2A operating loop is:

`Capture -> Triage -> Assign workstream -> Define next action or review condition -> Review status -> Resolve or archive`

Phase 2A remains completely manual. It does not infer, classify, summarize, recommend, notify, ingest, or act autonomously.

The intended completion state remains:

`PHASE_2A_MANUAL_WORKSTREAM_COMMAND_CENTER_HUMAN_ACCEPTED`

That state may be recorded only after protected-review deployment and real-device human acceptance are separately authorized and completed.

---

## 2. Accepted Phase 1 Baseline

### 2.1 Source baseline

All Phase 2A branching and implementation must begin from a clean `main` worktree at:

`5b48bacb9886cd2196c71a0bf93d01353eeef54d`

The original Phase 1 migration must remain unchanged:

`supabase/migrations/202607240001_create_entries.sql`

Phase 2A must use a new additive migration. It must not edit, replace, reorder, or reinterpret the accepted Phase 1 migration.

### 2.2 Existing application contract

The accepted application currently provides:

- Supabase email/password authentication;
- owner-scoped access through verified access tokens;
- forced Row Level Security;
- a Phase 1 root brief at `/`;
- the existing capture form at `/capture`;
- the archive at `/archive`;
- entry detail and editing at `/entries/[id]`;
- manual review and restore-to-unreviewed behavior;
- manual archive and restore behavior;
- confirmed permanent deletion;
- responsive phone and desktop behavior; and
- authenticated cross-device synchronization.

Every one of these behaviors remains in scope and must continue to work during protected Phase 2A review.

### 2.3 Existing database contract

The accepted source table is `public.entries`, not `brief_entries`.

Existing fields are:

- `id`
- `user_id`
- `title`
- `content`
- `category`
- `priority`
- `created_at`
- `updated_at`
- `reviewed_at`
- `archived_at`

These fields and all existing values must be preserved. Phase 2A must not rename, remove, overwrite, or repurpose them.

The existing category values remain:

- `note`
- `decision`
- `follow_up`
- `reference`
- `personal`

The existing priority values remain:

- `low`
- `normal`
- `high`

The existing Phase 1 schema has no follow-up date, project field, source-context field, general status field, user-settings table, brief-history table, `/settings` route, or `/brief/[brief-id]` route. Phase 2A must not pretend those assets already exist.

---

## 3. Product Objective

Create one private, responsive command center where the owner can:

1. preserve an update quickly on a phone;
2. recover it later on a computer;
3. deliberately triage it;
4. assign it to one workstream;
5. define its operational state and next action or review condition;
6. review workstream health and staleness; and
7. complete a manual weekly review without reconstructing context elsewhere.

### Primary success question

> Can the owner capture one consequential development on a phone, recover it on a computer, triage it into the correct workstream, define the next action or review condition, see its effect on waiting, blocked, risk, and stale views, and complete a weekly review entirely inside Neverlost without disrupting any accepted Phase 1 behavior?

---

## 4. Scope

### 4.1 Included

1. Manual workstream creation, viewing, editing, pausing, completion, reopening, and deletion.
2. Separate manual workstream lifecycle status and health.
3. Manual command-item triage using additive fields on `public.entries`.
4. Assignment of one non-inbox command item to one owner-matched workstream.
5. Structured command type, command state, next action, due date, and review date.
6. A new Command Center at `/dashboard` during protected review.
7. Deterministic stale-workstream detection.
8. A guided manual weekly-review flow.
9. A one-field quick capture on the dashboard.
10. Preservation of the existing `/capture` form and every Phase 1 route and lifecycle.
11. Backward-compatible migration of every existing Phase 1 entry.
12. A minimal owner-scoped `user_preferences` record containing only the latest weekly-review completion timestamp.
13. Existing authentication, RLS, and cross-device behavior.

### 4.2 Explicit non-goals

- AI-generated text, summaries, briefs, classifications, priorities, statuses, next actions, or recommendations.
- OpenAI API integration.
- Gmail, Google Calendar, GitHub, Slack, Teams, or other ingestion.
- Notifications, reminders, schedulers, monitors, or background jobs.
- Autonomous state changes.
- Automatic stale remediation.
- Multiple users collaborating on shared records.
- Teams, organizations, roles, or delegated access.
- Multiple workstreams per command item.
- Command-item dependencies.
- Recurring command items.
- Full workstream update history.
- Weekly-review history beyond the latest completion timestamp.
- Replacement of the full Neverlost project ledger.
- Unrelated refactoring or design-system replacement.
- Production deployment or production-data modification.

---

## 5. Terminology and Domain Model

### 5.1 Phase 1 entry

A Phase 1 entry is the existing durable source record in `public.entries`. Its title, content, category, priority, timestamps, review state, and archive state remain authoritative and independently meaningful.

Phase 2A extends this record into a **command item**. It does not replace the entry.

### 5.2 Workstream

A workstream is a bounded area of ongoing responsibility or development with a defined objective, lifecycle status, health, review date, and latest manual status update.

Required workstream concepts:

- **Name** - short, stable label.
- **Objective** - what success or forward movement means.
- **Status** - `proposed`, `active`, `paused`, or `completed`; defaults to `proposed` at creation.
- **Health** - `on_track`, `at_risk`, or `off_track`; defaults to `on_track` at creation.
- **Next review date** - when deliberate review should occur.
- **Stale threshold** - manual number of days, default seven, allowed one through ninety.
- **Latest manual status update** - concise owner-written statement of current reality.

At workstream creation, `status` defaults to `proposed`, `health` defaults to `on_track`, and `stale_after_days` defaults to `7`. All three remain manually editable within their allowed values.

Status and health remain separate:

- Status answers: **Where is this in its lifecycle?**
- Health answers: **How is it going relative to its objective?**

No status implies a health value, and no health value changes status automatically.

### 5.3 Command item

A command item is an existing `public.entries` record with additive operational fields.

#### Command type

- `note` - context worth preserving.
- `action` - a concrete step the owner can take.
- `decision` - a confirmed choice or boundary.
- `risk` - a threat, uncertainty, or condition that may impair progress.
- `question` - an unresolved question requiring an answer.
- `commitment` - an obligation or promise by the owner or another party.

Command type does not replace the Phase 1 `category`. Both remain stored and visible.

#### Command state

- `inbox` - captured or returned for deliberate triage.
- `active` - currently actionable or being worked.
- `waiting` - dependent on a person, event, result, or external decision.
- `blocked` - unable to proceed because of a known barrier.
- `resolved` - no further action is currently required.

Command state does not replace `reviewed_at` or `archived_at`.

#### Additional fields

- **Workstream** - one workstream owned by the same authenticated user.
- **Next action** - the next concrete owner-written step.
- **Due date** - when completion is expected or required.
- **Review date** - when the item should be reconsidered if no action or answer has occurred.
- **Triaged at** - the first time the item leaves inbox through deliberate triage.
- **Resolved at** - the most recent transition into resolved.

### 5.4 User preferences

Phase 2A adds one minimal owner-scoped preference record containing:

- `user_id`
- `last_weekly_review_completed_at`
- `created_at`
- `updated_at`

No additional user profile, settings surface, preference history, or unrelated configuration is authorized.

---

## 6. Logical Data Model

### 6.1 New `public.workstreams` table

| Field | Logical type | Required | Rule |
|---|---|---:|---|
| `id` | UUID | Yes | Primary key; server-generated |
| `user_id` | UUID | Yes | Owner; references `auth.users` |
| `name` | Text | Yes | Nonblank; unique per user after trimming and case folding |
| `objective` | Text | Yes | Nonblank owner-written purpose |
| `status` | Text/check | Yes | Default `proposed`; allowed `proposed`, `active`, `paused`, `completed` |
| `health` | Text/check | Yes | Default `on_track`; allowed `on_track`, `at_risk`, `off_track` |
| `next_review_on` | Date | No | America/Denver calendar date |
| `stale_after_days` | Small integer | Yes | Default `7`; allowed `1-90` |
| `latest_status_update` | Text | No | Latest nonblank manual statement |
| `latest_status_updated_at` | Timestamp | No | Database-maintained when status-update text changes |
| `completed_at` | Timestamp | No | Database-maintained while status is completed |
| `created_at` | Timestamp | Yes | Server-generated |
| `updated_at` | Timestamp | Yes | Database-maintained |

### 6.2 Additive fields on `public.entries`

| New field | Logical type | Required | Rule |
|---|---|---:|---|
| `workstream_id` | UUID | No | Owner-matched FK; workstream deletion removes assignment |
| `command_type` | Text/check | Yes | Default `note` |
| `command_state` | Text/check | Yes | Default `inbox` |
| `next_action` | Text | No | Nonblank when present |
| `due_on` | Date | No | America/Denver calendar date |
| `review_on` | Date | No | America/Denver calendar date |
| `triaged_at` | Timestamp | No | Database-maintained first non-inbox transition |
| `resolved_at` | Timestamp | No | Database-maintained resolved transition |

### 6.3 New `public.user_preferences` table

| Field | Logical type | Required | Rule |
|---|---|---:|---|
| `user_id` | UUID | Yes | Primary key and owner reference |
| `last_weekly_review_completed_at` | Timestamp | No | Set only by explicit review completion |
| `created_at` | Timestamp | Yes | Server-generated |
| `updated_at` | Timestamp | Yes | Database-maintained |

### 6.4 Ownership integrity

- RLS must apply to `entries`, `workstreams`, and `user_preferences` through `user_id = auth.uid()`.
- Existing entry policies remain intact.
- Workstreams and preferences require explicit owner-only select, insert, update, and delete policies.
- Anonymous table privileges must be revoked.
- A command item may reference only a workstream owned by the same user.
- Same-owner assignment must be enforced at the database layer, not only by application filtering.
- Deleting a workstream must never delete an entry.
- Browser clients must never receive service-role credentials.

---

## 7. Migration and Backfill Plan

### 7.1 Migration form

Phase 2A requires one new additive forward migration and one separately stored rollback migration.

The forward migration must:

1. create `public.workstreams`;
2. add the approved command fields to `public.entries`;
3. create `public.user_preferences`;
4. add controlled-value and ownership constraints;
5. add indexes for deterministic dashboard queries;
6. add database-maintained transition timestamps;
7. enable and force RLS on both new tables;
8. add owner-only policies and grants; and
9. leave the original Phase 1 migration unchanged.

### 7.2 Existing-entry backfill

Every existing Phase 1 entry must retain its complete original record and receive exactly:

- `command_type = note`
- `command_state = inbox`
- `workstream_id = null`
- `next_action = null`
- `due_on = null`
- `review_on = null`
- `triaged_at = null`
- `resolved_at = null`

The migration must not infer or synthesize:

- a workstream;
- a command state other than inbox;
- a command type from the existing category;
- a next action;
- a due date;
- a review date;
- a waiting or blocked condition;
- resolution from `reviewed_at` or `archived_at`; or
- any field from the `follow_up` category.

There is no existing follow-up date to copy.

### 7.3 Preservation assertions

Before and after migration, automated comparison must prove that every original entry retains the same:

- row count;
- `id`;
- `user_id`;
- `title`;
- `content`;
- `category`;
- `priority`;
- `created_at`;
- `updated_at` as captured immediately before migration;
- `reviewed_at`; and
- `archived_at`.

Migration mechanics must not cause the existing entry update trigger to rewrite `updated_at` for all rows.

### 7.4 Migration gate

The forward migration may not be applied to the protected hosted project until:

1. this specification is explicitly approved;
2. implementation is separately authorized;
3. a production-like copy or export exists;
4. forward migration passes against that copy;
5. preservation assertions pass;
6. the rollback migration passes against a disposable copy;
7. Phase 1 regressions pass after migration; and
8. RLS and same-owner foreign-key isolation pass with two users.

No production data may be used as an implementation sandbox.

### 7.5 Rollback gate

Rollback is automatically safe only before meaningful Phase 2A data is created.

Before any rollback that would remove Phase 2A columns or tables:

1. export all workstreams, command fields, and preference values;
2. confirm whether Phase 2A records exist;
3. preserve every Phase 1 field and row;
4. verify the Phase 1 application still reads the restored schema;
5. obtain explicit human authorization; and
6. run the rollback first against a copy.

A rollback must never delete or overwrite Phase 1 entry content. Once meaningful Phase 2A data exists, dropping Phase 2A storage is destructive and requires a separately approved recovery plan.

---

## 8. Deterministic Quick Capture

### 8.1 Existing capture remains unchanged

The accepted `/capture` form remains available with:

- title;
- content;
- category; and
- priority.

Its existing validation, save behavior, cross-device behavior, and route must continue to pass Phase 1 regression tests.

### 8.2 New dashboard quick capture

The `/dashboard` quick-capture control contains one multiline text field and one save action.

Rules:

1. Whitespace-only input is rejected.
2. The existing maximum content length of 20,000 characters remains enforced.
3. Existing leading/trailing whitespace normalization may be applied, but no nonblank line, wording, punctuation, or internal line break may be summarized or discarded.
4. The complete normalized entered text is stored as `content`.
5. `title` is derived on the authenticated server from the first nonblank line.
6. The chosen line is trimmed at its edges.
7. The title is truncated deterministically to the existing 160-character database limit without splitting a Unicode surrogate pair.
8. No ellipsis or generated wording is appended.
9. `category` is explicitly set to `note`.
10. `priority` is explicitly set to `normal`.
11. `command_type` is explicitly set to `note`.
12. `command_state` is explicitly set to `inbox`.
13. `workstream_id`, `next_action`, `due_on`, `review_on`, `triaged_at`, `resolved_at`, `reviewed_at`, and `archived_at` are null.
14. `user_id` is derived only from the verified authenticated user.
15. The saved item appears in Needs triage and remains available through the Phase 1 entry views.

Title derivation is mechanical string handling, not AI classification.

### 8.3 Failure behavior

- Validation errors must not create partial records.
- A failed save must preserve the text in the form.
- Success must be shown only after the database confirms insertion.
- The interface must not guess a different title, category, priority, workstream, state, or action.

---

## 9. State and Timestamp Semantics

`reviewed_at`, `triaged_at`, `resolved_at`, `archived_at`, and `command_state` are independent concepts.

### 9.1 Review transitions

| Action | `reviewed_at` | Other Phase 2A fields |
|---|---|---|
| Mark reviewed | Set to current timestamp | Unchanged |
| Restore to unreviewed | Set to null | Unchanged |

Review means the owner has deliberately reviewed the Phase 1 entry. It does not mean the item was triaged, resolved, archived, or assigned.

### 9.2 Archive transitions

| Action | `archived_at` | Command fields |
|---|---|---|
| Archive | Set to current timestamp | Preserved unchanged |
| Restore | Set to null | Preserved unchanged |

Archived entries are excluded from every active Command Center query. Restoring an entry returns it to the dashboard section determined by its preserved command fields.

### 9.3 Command-state transitions

Allowed deliberate transitions are:

| From | Allowed destinations |
|---|---|
| `inbox` | `active`, `waiting`, `blocked`, `resolved` |
| `active` | `inbox`, `waiting`, `blocked`, `resolved` |
| `waiting` | `inbox`, `active`, `blocked`, `resolved` |
| `blocked` | `inbox`, `active`, `waiting`, `resolved` |
| `resolved` | `inbox`, `active`, `waiting`, `blocked` |

Rules:

- Every non-inbox state requires an owner-matched workstream.
- Deliberately returning an item to inbox removes its workstream assignment.
- `triaged_at` is set only the first time an item leaves inbox and is never rewritten or cleared by later re-triage.
- `resolved_at` is set when an item enters resolved.
- `resolved_at` is cleared when an item leaves resolved.
- Entering resolved does not archive or delete the item.
- Leaving resolved does not alter `reviewed_at` or `archived_at`.
- Command type may be changed manually without changing command state.
- Next action, due date, and review date remain owner-controlled and are not inferred during transitions.
- Previously entered structured fields remain preserved when an item returns to inbox unless the owner edits them.

### 9.4 Workstream deletion transition

Workstream deletion requires explicit human confirmation before the operation begins. The confirmation must:

- name the workstream;
- show the number of related entries;
- explain that the workstream will be deleted;
- explain that no entries will be deleted; and
- explain that related entries will return to Needs triage.

Deleting a workstream must occur as one database-consistent operation:

1. preserve every related `public.entries` row;
2. set `workstream_id = null` on related entries;
3. set their `command_state = inbox`;
4. clear `resolved_at` if an affected item was resolved;
5. preserve `triaged_at` as historical first-triage evidence;
6. preserve `created_at`, `reviewed_at`, and `archived_at`;
7. preserve `title`, `content`, `user_id`, `category`, `priority`, command type, next action, due date, and review date;
8. allow the accepted Phase 1 update behavior to update `updated_at`; and
9. delete only the workstream row.

The affected entries must then appear under Needs triage when not archived.

Returning an entry to inbox during workstream deletion is a material post-migration entry update. `updated_at` is therefore expected to change through the accepted Phase 1 update trigger. This operational transition does not require `updated_at` to remain unchanged. It does not weaken the separate migration-preservation requirement that the forward schema migration itself must not rewrite existing entry timestamps.

### 9.5 Workstream status transitions

Allowed status transitions are:

| From | Allowed destinations |
|---|---|
| `proposed` | `active`, `paused`, `completed` |
| `active` | `paused`, `completed` |
| `paused` | `active`, `completed` |
| `completed` | `active`, `paused` |

Rules:

- `completed_at` is set when status enters completed.
- `completed_at` is cleared when status leaves completed.
- Health never changes automatically when status changes.
- Paused does not imply off track.
- Completed workstreams are excluded from stale detection.

### 9.6 Latest status update

- `latest_status_updated_at` changes only when `latest_status_update` changes.
- Clearing the latest status text clears its timestamp.
- Editing another workstream field updates `updated_at` but not `latest_status_updated_at`.
- No automatic status update text is generated.

### 9.7 Permanent deletion

The accepted Phase 1 entry deletion behavior remains:

- explicit confirmation is required;
- the selected entry is permanently deleted;
- no workstream or other entry is deleted with it; and
- no automatic recovery is implied.

---

## 10. Product Timezone and Date Rules

Phase 2A uses the IANA timezone `America/Denver` for date-only and stale calculations.

- `due_on`, `review_on`, and `next_review_on` are calendar dates, not instants.
- “Today” means the current calendar date in `America/Denver`.
- The authenticated server must derive the canonical current date; dashboard logic must not rely solely on an arbitrary browser timezone.
- Stored timestamps remain timezone-aware instants and may be stored in UTC.
- Displayed Phase 2A dates and weekly-review timestamps use `America/Denver` unless a later phase explicitly adds user-selectable timezone settings.

### Stale calculation

A non-completed workstream is stale when either condition is true:

1. `next_review_on` is earlier than today in `America/Denver`; or
2. the local calendar date of its latest meaningful update plus `stale_after_days` is earlier than today.

The latest meaningful update is the most recent timestamp among:

- `latest_status_updated_at`
- `updated_at`
- `created_at`

This is a chronological maximum across all available timestamps. It is not first-non-null fallback precedence.

An owner-confirmed workstream edit during weekly review is a material workstream update and may therefore reset the elapsed-day stale calculation through `updated_at`, even when `latest_status_update` text itself did not change.

The overdue `next_review_on` rule remains independently sufficient to make a non-completed workstream stale. A recent workstream edit does not override an overdue review date.

With a stale threshold of seven days, a workstream becomes stale on the eighth America/Denver calendar day after its latest meaningful update unless an earlier overdue review date makes it stale first.

Stale is a deterministic review signal, not a judgment of failure. No status, health, date, or text changes automatically when a workstream becomes stale.

---

## 11. Derived Command Center Queries

All entry queries must apply:

- authenticated owner scope through RLS;
- defense-in-depth owner filtering in the API; and
- `archived_at is null`.

### 11.1 Needs triage

- `command_state = inbox`
- Order by `created_at` ascending, then `id` ascending.

Oldest-first ordering prevents earlier captures from disappearing beneath new items.

### 11.2 Active workstreams

- `status = active`
- Health order: `off_track`, `at_risk`, `on_track`.
- Within health: non-null `next_review_on` ascending, null dates last.
- Final tie-breaker: `updated_at` descending, then `id` ascending.

### 11.3 Next actions

- `command_state = active`
- `next_action` is nonblank.
- Overdue non-null `due_on` first.
- Then future/non-overdue `due_on` ascending.
- Then non-null `review_on` ascending.
- Null dates last.
- Final tie-breaker: `updated_at` descending, then `id` ascending.

### 11.4 Blocked and at risk

This combined section contains two clearly labeled record types:

- entries with `command_state = blocked`; and
- workstreams with `health = at_risk` or `off_track` and `status <> completed`.

Item state and workstream health must never be visually or semantically conflated.

### 11.5 Waiting on

- `command_state = waiting`
- Overdue non-null `review_on` first.
- Then non-null `review_on` ascending.
- Null review dates last but visibly incomplete.
- Final tie-breaker: `updated_at` ascending, then `id` ascending.

### 11.6 Recent decisions

- `command_type = decision`
- `command_state <> inbox`
- Include resolved decisions.
- Order by `triaged_at` descending, then `updated_at` descending, then `id` ascending.
- Limit to ten on the dashboard preview.

Resolving or archiving a related action must not alter a decision record.

### 11.7 Stale workstreams

- `status <> completed`
- Apply the America/Denver stale rule in Section 10.
- Order overdue review dates first, then oldest latest meaningful update, then `id`.

### 11.8 Counts and bounded previews

- Dashboard counts must use the same predicates as their corresponding lists.
- Counts update only after confirmed saves or edits.
- Each dashboard section shows a bounded preview and a View all route or filtered destination.
- Zero-state and large-list behavior must both remain useful.
- No query may produce inferred recommendations.

---

## 12. Route and Screen Map

During protected Phase 2A review, the accepted Phase 1 root remains available.

```text
Authenticated application shell
  |-- /                         Existing Phase 1 Executive Brief
  |-- /capture                  Existing four-field Phase 1 capture
  |-- /archive                  Existing Phase 1 archive
  |-- /entries                  All active command items and legacy entries
  |    `-- /entries/[id]        Existing detail plus additive triage fields
  |-- /dashboard                New Phase 2A Command Center
  |    `-- one-field quick capture
  |-- /triage                   Inbox-to-command-item workflow
  |-- /workstreams              All workstreams
  |    `-- /workstreams/[id]    Workstream detail and related items
  `-- /review                   Manual weekly review
```

Authentication remains the existing application-level Supabase sign-in gate. A dedicated `/login` route is not required for Phase 2A.

No `/settings` route is added. The minimal `user_preferences` record is managed only through explicit weekly-review completion.

No `/brief/[brief-id]` route is added because Phase 1 has no brief-history entity. The existing root, archive, and entry-detail routes are the preserved Phase 1 history surfaces.

No route replacement or redirect from `/` to `/dashboard` is authorized during protected review. Any future change of the default root requires separate human acceptance.

---

## 13. Screen Behavior

### 13.1 Command Center dashboard

Desktop sections:

1. Summary counts.
2. Needs triage.
3. Active workstreams.
4. Next actions.
5. Recent decisions.
6. Blocked and at risk.
7. Stale workstreams.
8. Waiting on.
9. Quick capture.

Phone priority order:

1. Quick capture.
2. Needs triage count and first items.
3. Next actions.
4. Waiting and blocked.
5. Active workstreams.
6. Remaining sections.

Health and lifecycle status must use text labels in addition to visual indicators.

### 13.2 Triage screen

The triage screen presents one non-archived inbox item at a time with:

- preserved title and content;
- preserved Phase 1 category, priority, review state, and timestamps;
- workstream assignment;
- command type;
- command state;
- next action;
- due date;
- review date;
- save and move to next; and
- create-workstream-without-losing-triage-context.

The user may leave an item in inbox without adding structure.

### 13.3 Workstream detail

Show:

- name and objective;
- lifecycle status and health;
- next review date and stale threshold;
- latest manual status update and timestamp;
- unresolved command items grouped by state;
- recent decisions;
- resolved items collapsed by default; and
- explicit update, pause, complete, reopen, and delete actions.

### 13.4 All entries

`/entries` provides a durable flat view of active, non-archived entries and their legacy and command fields. It does not replace `/archive`.

### 13.5 Responsive behavior

- No horizontal page scrolling at supported phone width.
- Dashboard quick capture remains one-screen and one-save-action.
- Existing `/capture` remains usable on phone and desktop.
- Voice dictation remains available through the device keyboard.
- No drag-and-drop interaction is required.

---

## 14. Weekly Review

The weekly review is a guided manual checklist:

1. Review every inbox item or deliberately leave it in inbox.
2. Review each active workstream's objective, status, and health.
3. Confirm one next action or a waiting/blocked condition for each active priority.
4. Review overdue due dates and review dates.
5. Review waiting and blocked items.
6. Review recent decisions.
7. Review stale workstreams.
8. Resolve or archive completed items deliberately.
9. Set or confirm the next review date and latest status update for every active workstream.
10. Explicitly mark the weekly review complete.

Completion behavior:

- No item or workstream changes automatically when the checklist opens or completes.
- Completion requires an explicit final action.
- After confirmed completion, upsert the authenticated owner's `user_preferences` row.
- Set `last_weekly_review_completed_at` to the server-confirmed current instant.
- Display the timestamp in `America/Denver`.
- Store only the latest completion timestamp.
- Do not create review history, notifications, recurring tasks, or next-review recommendations.

---

## 15. Validation and Manual-First Rules

1. Existing `/capture` retains its accepted Phase 1 validation.
2. Dashboard quick capture requires only nonblank content.
3. Every quick capture enters inbox with explicit safe defaults.
4. The system never infers workstream, priority, command type, command state, health, next action, or date.
5. A non-inbox command item must have one owner-matched workstream.
6. An active item should have a next action or explicit review date; the triage interface must flag absence before deliberate save.
7. Waiting and blocked items should have a review date; the triage interface must flag absence before deliberate save.
8. A decision remains a decision when related actions resolve.
9. Stale is informational and never mutates data.
10. Enum and range values are validated by both server schemas and database constraints.
11. Owner IDs and transition timestamps are never accepted as trusted browser input.
12. Raw provider errors and private entry content are not logged or returned in error responses.

---

## 16. Acceptance Criteria

### AT-01 - Phase 1 migration preservation

Given the accepted Phase 1 data, when the Phase 2A migration is applied to a production-like copy, every entry retains every original field and receives only the approved additive defaults.

### AT-02 - Existing capture preservation

Given an authenticated user on `/capture`, when the existing title, content, category, and priority form is submitted, the accepted Phase 1 save and cross-device behavior remains unchanged.

### AT-03 - Dashboard quick capture

Given an authenticated phone session on `/dashboard`, when the user submits one nonblank multiline value, the complete normalized value is stored as content; title is derived from the first nonblank line within 160 characters; category and priority use explicit safe defaults; and the item enters inbox without inference.

### AT-04 - Cross-device continuity

Given an item captured on the phone by either accepted capture surface, when the same owner opens the computer, the identical entry is present without re-entry or copying.

### AT-05 - Workstream creation

Given the owner is triaging an item, when a valid workstream is created, it is immediately available for assignment without losing the triage form; status defaults to proposed, health defaults to on track, and the stale threshold defaults to seven days. Each default remains manually editable within its allowed values.

### AT-06 - Complete triage

Given an inbox item, when the owner assigns an owner-matched workstream, command type, state, and appropriate action/date fields, the item leaves Needs triage, records first triage time, and appears in the correct deterministic section.

### AT-07 - Next-action visibility

Given an active non-archived item with a next action, when the dashboard loads, the next action appears in the specified order.

### AT-08 - Waiting visibility

Given a non-archived item moved to waiting, when the dashboard loads, it appears under Waiting on and not under active Next actions.

### AT-09 - Blocked and health visibility

Given a blocked item and an at-risk or off-track non-completed workstream, both appear in Blocked and at risk with distinct record-type and state/health labels.

### AT-10 - Decision preservation

Given a triaged decision item, when related actions resolve, the decision remains visible under Recent decisions and in its workstream.

### AT-11 - Stale detection

Given the approved America/Denver date boundary, the latest meaningful update is calculated as the chronological maximum of `latest_status_updated_at`, `updated_at`, and `created_at`. A non-completed workstream appears stale when its independently sufficient review-date rule is overdue or that latest timestamp exceeds its configured calendar-day threshold. An owner-confirmed workstream edit may reset the elapsed-day calculation even when latest-status text is unchanged, but it cannot override an overdue `next_review_on`.

### AT-12 - Resolution and reopening

When an item enters resolved, `resolved_at` is recorded and it leaves unresolved sections. When it is reopened, `resolved_at` is cleared without changing Phase 1 review or archive state.

### AT-13 - Archive isolation

Given an archived entry in any command state, it is absent from every active Command Center count and list. Restoring it returns it to the section determined by its preserved command state.

### AT-14 - Workstream deletion preservation

Given a workstream with entries, deletion cannot proceed until the owner confirms a prompt that names the workstream, shows the related-entry count, and explains the workstream deletion, entry preservation, and return to Needs triage. After confirmation, no entry is deleted; assignment is removed; affected entries return to inbox; `updated_at` changes through the accepted Phase 1 update behavior; `created_at`, `reviewed_at`, `archived_at`, and `triaged_at` remain preserved; `resolved_at` is cleared only for affected resolved items; all other specified entry fields remain preserved; and non-archived entries appear in Needs triage.

### AT-15 - Weekly review

Given mixed inbox, active, waiting, blocked, resolved, healthy, at-risk, stale, reviewed, and archived records, the owner can complete the guided review without leaving Neverlost. Only the latest explicit completion timestamp is recorded.

### AT-16 - Mobile usability

At a narrow phone viewport, dashboard capture and top-priority review require no horizontal scrolling, and quick capture remains one field and one save action.

### AT-17 - Security isolation

Every browser database request can read or write only the authenticated owner's entries, workstreams, and preference row. Cross-owner workstream assignment fails at the database layer.

### AT-18 - Phase 1 lifecycle regression

Review/unreview, edit, archive, archive visibility, restore, confirmed delete, authentication, and phone-to-computer synchronization continue to pass after Phase 2A migration and UI additions.

### AT-19 - Manual-only boundary

Inspection of the completed candidate finds no AI generation, autonomous classification, external ingestion, notification, scheduler, or automatic action.

### AT-20 - Protected-review boundary

Phase 2A remains confined to a separately authorized protected review environment. No production deployment, public launch, or production-data change occurs.

### Human acceptance scenario

Phase 2A passes only when the owner personally demonstrates:

1. the existing Phase 1 capture on a real device;
2. one-field dashboard quick capture on a real phone;
3. recovery of both records on a computer;
4. manual workstream creation;
5. triage with type, state, action, and date;
6. waiting and blocked transitions;
7. a workstream health change;
8. correct deterministic dashboard placement;
9. stale-workstream update or resolution;
10. workstream deletion with entry preservation and re-triage;
11. the complete weekly review;
12. review, archive, restore, edit, and deletion regression; and
13. intact Phase 1 records throughout.

---

## 17. Regression and Verification Requirements

### 17.1 Phase 1 permanent regression suite

- TypeScript verification.
- ESLint.
- Vitest.
- Production build.
- Existing responsive Playwright test.
- Existing authenticated phone-to-desktop lifecycle.
- Existing timestamp-offset regression.
- Existing unauthenticated API rejection.
- Existing owner-only entry RLS isolation.
- Migration field-for-field preservation comparison.
- Existing route availability and lifecycle controls.

### 17.2 Phase 2A database verification

- Forward migration on a Phase 1 data copy.
- Rollback on a disposable copy.
- Workstream controlled values and case-insensitive owner uniqueness.
- Workstream creation defaults of `proposed`, `on_track`, and seven stale days, including manual edits to every allowed value.
- Entry command controlled values.
- Stale-threshold range.
- Owner-only CRUD policies on new tables.
- Anonymous access revocation.
- Cross-user entry isolation.
- Cross-user workstream isolation.
- Cross-user preference isolation.
- Cross-owner workstream assignment rejection.
- Workstream deletion preserving entries, returning them to inbox, updating `updated_at`, preserving the specified timestamps and fields, and clearing `resolved_at` only for affected resolved items.
- Transition timestamp behavior.
- Zero retained test records after transactional isolation tests.

### 17.3 Phase 2A unit verification

- Quick-capture title derivation, including blank first lines, long lines, line breaks, and Unicode.
- Safe defaults and rejection of client-supplied owner/transition fields.
- Command validation and allowed transitions.
- Workstream validation and allowed transitions.
- Every deterministic dashboard predicate and tie-breaker.
- Archived-entry exclusion from every active selector.
- America/Denver date and daylight-saving boundaries.
- Stale detection using the chronological maximum of all three meaningful-update timestamps.
- Weekly-review workstream edits resetting elapsed-day staleness through `updated_at` without changing latest-status text.
- Independently overdue `next_review_on` remaining sufficient after a recent edit.
- Decision preservation after resolution.
- Weekly-review preference upsert behavior.

### 17.4 Phase 2A Playwright verification

- Dashboard zero state and populated state.
- Phone quick capture and desktop recovery.
- Existing `/capture` regression.
- Workstream creation during triage.
- Workstream creation defaults and manual editing of each default.
- Triage through active, waiting, blocked, resolved, and reopened states.
- Dashboard section and count updates after confirmed saves.
- Archive exclusion and restoration.
- Workstream deletion confirmation naming the workstream, showing the related-entry count, and explaining deletion, preservation, and re-triage before the operation proceeds.
- Workstream deletion timestamp and field preservation after confirmation.
- Weekly-review completion.
- Phone and desktop layouts.
- Bounded previews and View all navigation.
- No horizontal scrolling at the accepted phone viewport.

---

## 18. Bounded Implementation Sequence After Approval

This sequence is descriptive only. Implementation requires separate explicit authorization.

1. Record human approval of this v0.2.1 specification.
2. Verify clean `main` at the required baseline commit.
3. Create an isolated Phase 2A branch.
4. Capture schema and production-like data snapshots without changing production.
5. Write the additive forward and rollback migrations.
6. Add migration preservation and RLS tests before application changes.
7. Extend shared validation and entry types.
8. Add workstream and preference APIs.
9. Build workstream CRUD.
10. Add the dashboard quick-capture endpoint and component.
11. Extend entry detail and build the triage workflow.
12. Build deterministic dashboard queries and `/dashboard`.
13. Build `/entries`, workstream detail, and weekly review.
14. Run Phase 1 regression and Phase 2A test suites.
15. Apply and roll back against a production-like copy.
16. Review all diffs, migration output, and security evidence.
17. Stop and request authorization before any protected-review deployment.
18. Run real-device acceptance only after deployment authorization.
19. Freeze Phase 2A only after explicit human acceptance.

Unrelated refactoring is prohibited throughout this sequence.

---

## 19. Production and Security Gates

- No production deployment is authorized.
- No production-data migration or modification is authorized.
- No Supabase authentication weakening is authorized.
- Public self-registration remains disabled.
- No service-role key may enter browser or application code.
- `.env.local` remains ignored and untracked.
- Migration execution requires a separately approved workflow.
- The protected Phase 1 preview remains the rollback reference.
- Failure of any Phase 1 regression blocks Phase 2A review deployment.
- Failure of RLS, ownership, preservation, or rollback testing blocks migration.
- Human acceptance cannot be inferred from automated tests.

---

## 20. Change Log from v0.1

1. Corrected the existing source table from `brief_entries` to `public.entries`.
2. Added the exact accepted Phase 1 fields and removed assumptions about nonexistent follow-up-date, project, source-context, status, settings, and brief-history assets.
3. Set the required implementation baseline to clean `main` at `5b48bacb9886cd2196c71a0bf93d01353eeef54d`.
4. Made preservation of the original Phase 1 migration explicit.
5. Preserved `/`, `/capture`, `/archive`, `/entries/[id]`, authentication, review, archive, restore, delete, RLS, and cross-device behavior.
6. Preserved the existing four-field `/capture` form.
7. Added a separate one-field dashboard quick capture with deterministic title derivation, complete content preservation, and explicit `note`/`normal` defaults.
8. Reconciled the existing-entry backfill to exact non-inferred defaults and null transition/date fields.
9. Replaced the nonexistent settings assumption with the minimal owner-scoped `user_preferences` table containing only the latest weekly-review completion timestamp.
10. Defined review, triage, resolution, archive, command-state, workstream-status, reopening, and deletion transitions separately.
11. Required archived-entry exclusion from every active Command Center query and count.
12. Defined workstream deletion as entry-preserving, assignment-clearing, and inbox-returning.
13. Set `America/Denver` as the Phase 2A product timezone and defined calendar-day stale boundaries.
14. Moved the new Command Center to `/dashboard` while preserving the Phase 1 root during protected review.
15. Removed `/login`, `/settings`, and `/brief/[brief-id]` assumptions from the Phase 2A route map.
16. Added deterministic query ordering and tie-breakers.
17. Expanded weekly-review behavior without adding review history.
18. Expanded Phase 1 regression, Phase 2A verification, migration-preservation, RLS, and rollback gates.
19. Reaffirmed the manual-only boundary and prohibited AI, external ingestion, notifications, deployment, production-data changes, and unrelated refactoring.

---

## 21. Change Log from v0.2 to v0.2.1

1. Replaced latest-meaningful-update fallback precedence with the chronological maximum of `latest_status_updated_at`, `updated_at`, and `created_at`.
2. Clarified that an owner-confirmed workstream edit, including during weekly review, may reset elapsed-day staleness through `updated_at` without changing latest-status text.
3. Confirmed that overdue `next_review_on` remains independently sufficient for stale status.
4. Defined workstream deletion as a material entry update: `updated_at` changes while the specified Phase 1 fields, structured fields, and first-triage evidence remain preserved.
5. Made workstream creation defaults explicit: `proposed`, `on_track`, and seven stale days, all manually editable.
6. Added the required human deletion confirmation content and corresponding acceptance and verification coverage.

---

## 22. Final Gate

This specification does not authorize implementation.

Do not begin coding until the owner explicitly approves:

1. the reconciled Phase 1 preservation contract;
2. the workstream and command-item definitions;
3. deterministic quick-capture behavior;
4. the additive data model and backfill;
5. the complete state-transition rules;
6. the America/Denver date and stale rules;
7. the `/dashboard` protected-review route strategy;
8. weekly-review persistence;
9. the acceptance and regression criteria;
10. migration and rollback gates; and
11. the manual-only and no-production boundaries.

PHASE_2A_RECONCILED_SPECIFICATION_V0_2_1_READY_FOR_HUMAN_REVIEW
