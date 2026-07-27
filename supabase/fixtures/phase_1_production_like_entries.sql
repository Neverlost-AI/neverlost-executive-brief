-- Synthetic production-like Phase 1 records. No production data is present.
insert into public.entries (
  id, user_id, title, content, category, priority,
  created_at, updated_at, reviewed_at, archived_at
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'Unreviewed decision', 'Confirm the bounded review decision.', 'decision', 'high',
   '2026-07-20T14:00:00-06:00', '2026-07-20T14:00:00-06:00', null, null),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
   'Reviewed Unicode note 🧭', 'Preserve Unicode and explicit UTC offsets.', 'note', 'normal',
   '2026-07-21T08:15:00-06:00', '2026-07-21T09:30:00-06:00', '2026-07-21T09:30:00-06:00', null),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002',
   'Archived owner-two reference', 'This row verifies ownership isolation and archive preservation.', 'reference', 'low',
   '2026-01-15T12:00:00+00:00', '2026-01-18T12:00:00+00:00', '2026-01-16T12:00:00+00:00', '2026-01-18T12:00:00+00:00');
