-- ===========================================================================
-- Marvell Florist — newsletter consent record
-- Migration 0006: the name somebody gave when they subscribed.
--
-- The signup dialog offers a salutation, a first name and a last name, and
-- requires none of them: a mailing list that will not take an address without
-- a full name is asking for something it does not need.
--
-- They are recorded here because newsletter_events is our own proof of who
-- agreed to what and when, held independently of Brevo. Brevo may or may not
-- carry the salutation — it refuses a contact for an attribute the account has
-- not defined, so that one is only sent when BREVO_TITLE_ATTRIBUTE names an
-- attribute that exists. This table keeps it either way.
-- ===========================================================================

alter table newsletter_events
  add column if not exists last_name text;

alter table newsletter_events
  add column if not exists title text;

-- The five the dialog actually offers.
--
-- This check used to allow three, while assets/newsletter.js has offered five
-- and netlify/functions/newsletter.mjs has accepted five. A subscriber who
-- chose Ms or Miss violated it, and because the insert's error was never
-- inspected the consent record was dropped in silence — the Brevo
-- subscription succeeded and our own proof of it did not exist. The endpoint
-- now checks that error; this is the other half of the fix.
--
-- Drop first, then add. The previous version wrapped the add in
-- `exception when duplicate_object then null`, which on a database where the
-- narrow constraint already exists would swallow the error and quietly leave
-- the old three-value rule in place. Widening has to actually happen on a
-- re-run.
--
-- Widening only: ('mr','mrs','mx') is a subset of the set below, so no row
-- that satisfied the old constraint can fail the new one.
alter table newsletter_events drop constraint if exists newsletter_events_title_check;
alter table newsletter_events
  add constraint newsletter_events_title_check
  check (title is null or title in ('mr', 'mrs', 'ms', 'miss', 'mx'));

comment on column newsletter_events.title is
  'Salutation chosen on the signup dialog: mr, mrs, ms, miss or mx. Optional, and never inferred from a name.';
