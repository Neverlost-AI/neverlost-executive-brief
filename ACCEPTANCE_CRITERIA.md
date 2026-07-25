# Acceptance Criteria

## Functional

- [ ] An unauthenticated visitor sees a sign-in screen and cannot read application data.
- [ ] A signed-in user can sign out.
- [ ] A phone-sized viewport can create a valid entry with clear success feedback.
- [ ] Invalid title, content, category, or priority is rejected in the client and server.
- [ ] The active dashboard excludes archived entries and orders unreviewed entries first.
- [ ] A user can view and edit all editable fields.
- [ ] Review and unreview actions persist after reload.
- [ ] Archive removes an entry from the active dashboard.
- [ ] Restore returns an archived entry to the active dashboard.
- [ ] Delete requires confirmation and permanently removes the entry.

## Security

- [ ] The browser contains no service-role credential.
- [ ] All four database operations are protected by owner-only RLS policies.
- [ ] A client-supplied `user_id` cannot change ownership.
- [ ] An unauthenticated request receives `401`.
- [ ] User A cannot select, update, archive, restore, or delete User B's entry.
- [ ] Entry content is not logged.

## Accessibility and responsive behavior

- [ ] Phone and desktop layouts remain usable without horizontal scrolling.
- [ ] Every field has a programmatic label.
- [ ] Keyboard users can reach every action with visible focus.
- [ ] Loading, success, empty, and error states are communicated in text.
- [ ] No workflow requires drag-and-drop.

## Release gate

The maximum status is `PHASE_1_MANUAL_CROSS_DEVICE_MVP_REVIEW_ONLY`. Acceptance passes only after the Playwright cross-device workflow and the manual checklist run successfully against a configured Supabase environment.
