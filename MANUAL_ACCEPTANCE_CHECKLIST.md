# Manual Acceptance Checklist

Run against the deployed review environment with a dedicated Supabase test user.

- [ ] Sign in successfully.
- [ ] At a 390 × 844 viewport, open Capture.
- [ ] Enter a unique title, content, category, and priority.
- [ ] Save and observe success confirmation.
- [ ] At a 1440 × 900 viewport, open the Executive Brief.
- [ ] Confirm the same entry appears as unreviewed.
- [ ] Open it and confirm complete content.
- [ ] Edit a field and save.
- [ ] Mark reviewed, reload, and confirm the reviewed state persists.
- [ ] Restore to unreviewed and confirm persistence.
- [ ] Archive and confirm removal from the active brief.
- [ ] Open Archive and confirm the entry is present.
- [ ] Restore and confirm it returns to the active brief.
- [ ] Delete it, cancel once, then confirm deletion.
- [ ] Sign out and confirm entry data is no longer visible.
- [ ] Repeat the ownership test with a second test user.

Record date, environment URL, tester, failures, and screenshots outside the repository only if the tester chooses.
