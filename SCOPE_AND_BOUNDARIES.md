# Scope and Boundaries

Status: `PHASE_1_MANUAL_CROSS_DEVICE_MVP_REVIEW_ONLY`

## In scope

- One authenticated user account per personal inbox.
- Manual entry capture, reading, editing, reviewing, unreviewing, archiving, restoring, and deleting.
- Supabase PostgreSQL persistence, Supabase Authentication, and mandatory Row Level Security.
- Responsive web access at phone and desktop widths.
- Validation in the browser, application server, and database constraints.
- Automated tests plus a manual acceptance checklist.

## Explicitly out of scope

- OpenAI or ChatGPT calls, MCP, AI summaries, AI prioritization, or AI generation.
- Gmail, calendars, GitHub, email monitoring, push notifications, or other external integrations.
- Background jobs, Windows automation, login/unlock launch behavior, or browser extensions.
- Organizations, billing, public sharing, or native mobile applications.
- Any automatic external action.

## Authority

Only the authenticated owner may change an entry. The software never changes entry content or workflow state without a direct user action. This repository does not modify or depend on another Neverlost repository.
