# Neverlost Executive Brief — Product Specification

Status: `PHASE_1_MANUAL_CROSS_DEVICE_MVP_REVIEW_ONLY`

## Purpose

Neverlost Executive Brief is a manual, authenticated continuity inbox. A person captures an important item on a phone, then reviews the same durable record on a computer. The product does not interpret, summarize, prioritize, generate, or transmit an entry automatically.

## Primary user journey

1. Sign in with email and password.
2. Capture a title, content, category, and priority on a phone-sized screen.
3. Open the dashboard on another device with the same account.
4. Review or edit the entry, mark it reviewed or unreviewed, archive or restore it, or permanently delete it after confirmation.
5. Reload and confirm the state remains unchanged.

## Required screens

- Authentication: sign in and sign out with explicit unauthenticated handling.
- Capture: a short mobile-first form with validation and success feedback.
- Executive Brief: active entries, with unreviewed entries first and newest unreviewed items first.
- Entry detail: complete content plus edit, review, archive, and delete controls.
- Archive: archived entries with restoration.

## Product rules

- Every entry belongs to exactly one authenticated Supabase user.
- The user is the only authority over entry wording and state.
- Archived entries never appear in the active brief.
- `reviewed_at` and `archived_at` are nullable timestamps controlled only by explicit user actions.
- The application remains review-only until human acceptance testing succeeds against a configured Supabase project.

## Success measure

The MVP succeeds when a signed-in test user can create an entry at a phone viewport, see it at a desktop viewport, persist reviewed state after reload, archive it out of the active brief, and find it in the archive.
