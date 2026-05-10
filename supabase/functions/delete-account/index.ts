// Supabase Edge Function: delete-account
//
// Apple App Store Guideline 5.1.1(v) requires an in-app account-deletion
// path for any app with sign-in. The iOS app calls this from Settings →
// Account → Delete account.
//
// What we delete:
//   - door_events authored by this user (always)
//   - doors owned individually (team_id IS NULL) — full delete
//   - doors stamped to a team — kept; user_id NULLed; rep_name preserved
//   - team_members rows for this user
//   - the auth.users row itself (via service role)
//
// Privacy policy at /privacy describes this exactly. Don't broaden the
// scope without updating that page.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: 'misconfigured' }, 500)
  }

  // Validate the caller's JWT and pull the auth.uid out of it.
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'unauthorized' }, 401)

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: userRes, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userRes?.user) return json({ error: 'invalid_token' }, 401)

  const userId = userRes.user.id
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Wipe individually-owned doors (cascades to door_events).
  const { error: indDelErr } = await admin
    .from('doors').delete()
    .eq('user_id', userId)
    .is('team_id', null)
  if (indDelErr) return json({ error: 'delete_individual_doors_failed', detail: indDelErr.message }, 500)

  // Anonymize team-owned doors so the team's history stays intact.
  const { error: anonDoorsErr } = await admin
    .from('doors').update({ user_id: null })
    .eq('user_id', userId)
    .not('team_id', 'is', null)
  if (anonDoorsErr) return json({ error: 'anonymize_team_doors_failed', detail: anonDoorsErr.message }, 500)

  // Anonymize team-owned door_events similarly (events under team-owned doors
  // survived the delete above; clear their user_id so deletion is complete).
  const { error: anonEventsErr } = await admin
    .from('door_events').update({ user_id: null })
    .eq('user_id', userId)
  if (anonEventsErr) return json({ error: 'anonymize_team_events_failed', detail: anonEventsErr.message }, 500)

  // Drop team memberships.
  const { error: tmErr } = await admin
    .from('team_members').delete()
    .eq('user_id', userId)
  if (tmErr) return json({ error: 'delete_team_members_failed', detail: tmErr.message }, 500)

  // Finally, the auth user. Cascades any remaining auth-side records.
  const { error: authDelErr } = await admin.auth.admin.deleteUser(userId)
  if (authDelErr) return json({ error: 'delete_auth_user_failed', detail: authDelErr.message }, 500)

  return json({ ok: true, deletedUserId: userId })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}
