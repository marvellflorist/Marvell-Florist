-- ===========================================================================
-- Marvell Florist — My Marvell
-- Migration 0007: a Supabase Auth user is not a My Marvell account.
--
-- The bug this migration exists to end: sign-in created accounts. Asking for a
-- code minted an auth user for any address typed into the box, and having an
-- auth user was taken to mean having My Marvell. So an address that had never
-- registered could sign in, and then Create My Marvell refused it as a
-- duplicate. Two different things had one representation.
--
-- From here there are two separate facts:
--
--   · auth.users            somebody who has proved a mailbox at least once.
--                           Created by registering, and by nothing else.
--
--   · profile_completed_at  somebody who has actually made My Marvell: chose
--                           a title, gave a name, and verified the address
--                           afterwards. Null until all three have happened.
--
-- Sign-in reads the second. Registration is allowed to run against a row where
-- the first already exists and the second does not, which is exactly the state
-- the old behaviour left addresses in.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The name, in the two parts the registration form asks for
--
-- full_name stays. It is what the earlier sign-up page wrote, it is what the
-- greeting used, and dropping it would lose the only name older rows have. It
-- is now derived on write from first_name and last_name rather than typed.
-- ---------------------------------------------------------------------------

alter table customer_profiles add column if not exists first_name text;
alter table customer_profiles add column if not exists last_name  text;

-- ---------------------------------------------------------------------------
-- The title set the registration form actually offers
--
-- Mr, Mrs, Ms, Miss, Mx. The newsletter form has offered these five for a
-- while; the account form offered three, so a person who is Ms on the mailing
-- list could not be Ms in My Marvell.
-- ---------------------------------------------------------------------------

alter table customer_profiles drop constraint if exists customer_profiles_title_check;
alter table customer_profiles
  add constraint customer_profiles_title_check
  check (title is null or title in ('mr', 'mrs', 'ms', 'miss', 'mx'));

-- ---------------------------------------------------------------------------
-- profile_completed_at — the one fact that means "this person has My Marvell"
--
-- Set once, by the OTP verification that finishes registration, and never by
-- anything that merely creates an auth user. Everything that asks "do they
-- have an account" asks this column and not auth.users.
-- ---------------------------------------------------------------------------

alter table customer_profiles add column if not exists profile_completed_at timestamptz;

comment on column customer_profiles.profile_completed_at is
  'When Create My Marvell was finished and the address verified. Null means an auth identity exists but My Marvell does not. This, never auth.users, decides whether somebody has an account.';

-- ---------------------------------------------------------------------------
-- pending_marketing_opt_in — a tick on the form, not yet a subscription
--
-- The newsletter box is answered while registering, before the address has
-- been verified. Subscribing at that moment would put an unverified address on
-- the mailing list, and would let anybody sign a stranger up by typing their
-- address into a registration form. So the answer is parked here and acted on
-- only after the code is verified, at which point it is handed to the existing
-- newsletter integration and this column goes back to false.
--
-- marketing_email_opt_in keeps its meaning exactly: subscribed, now. Creating
-- an account still never sets it on its own.
-- ---------------------------------------------------------------------------

alter table customer_profiles
  add column if not exists pending_marketing_opt_in boolean not null default false;

comment on column customer_profiles.pending_marketing_opt_in is
  'The newsletter box as ticked during registration, held until the address is verified. Never a subscription by itself.';

-- ---------------------------------------------------------------------------
-- Rows that predate this migration
--
-- An account made by the old sign-up page has a title and a full_name and was
-- reached through a verified code, so it is complete by every test that
-- mattered then. It is marked complete now rather than being quietly demoted
-- into a state where its owner can no longer sign in.
--
-- A row with no title or no name is left null on purpose: that is the
-- incomplete state, and its owner finishes registration like anybody else.
-- ---------------------------------------------------------------------------

update customer_profiles
   set profile_completed_at = coalesce(profile_completed_at, created_at),
       last_name = coalesce(last_name, nullif(btrim(full_name), ''))
 where profile_completed_at is null
   and title is not null
   and nullif(btrim(coalesce(full_name, '')), '') is not null;

-- ---------------------------------------------------------------------------
-- my_marvell_account — the only way to ask "is there an account for this
-- address", and the only place an email is matched to a user id.
--
-- Security definer because auth.users is not readable otherwise, and because
-- the alternative is listing every user over the admin API to find one row.
--
-- It returns a user id, which is not secret to the service role that called
-- it, together with the one boolean sign-in turns on. It does not return the
-- address back, does not confirm anything about the person, and cannot be
-- called by anon or authenticated.
-- ---------------------------------------------------------------------------

create or replace function my_marvell_account(p_email text)
returns table (user_id uuid, auth_exists boolean, profile_complete boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  if p_email is null or btrim(p_email) = '' then
    return query select null::uuid, false, false;
    return;
  end if;

  select u.id into v_id
    from auth.users u
   where lower(btrim(u.email)) = lower(btrim(p_email))
   order by u.created_at asc
   limit 1;

  if v_id is null then
    return query select null::uuid, false, false;
    return;
  end if;

  return query
    select v_id,
           true,
           exists (
             select 1 from customer_profiles p
              where p.user_id = v_id
                and p.profile_completed_at is not null
           );
end;
$$;

comment on function my_marvell_account(text) is
  'Whether an address has a Supabase Auth identity and, separately, a completed My Marvell profile. The two are not the same answer and sign-in reads the second.';

-- PUBLIC first, for the same reason as claim_orders_for_user: EXECUTE on a new
-- function is granted to it by default and anon holds it implicitly. This one
-- answers "does this address have an account", so reaching it without the
-- service key would turn it into an account-enumeration endpoint.
revoke all   on function my_marvell_account(text) from public, anon, authenticated;
grant execute on function my_marvell_account(text) to service_role;
