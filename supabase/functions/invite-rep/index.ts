// Supabase Edge Function: invite-rep
//
// Called by the manager portal when an owner/manager fills out the Invite
// modal. We:
//   1. Validate the caller is a manager or owner of the target team.
//   2. Upsert a pending_invites row with the intended role + rep_type.
//   3. Email the recipient a Supabase Auth magic-link via the Auth Admin
//      /invite endpoint.
//
// On first sign-in, the consume_pending_invites_after_signup trigger reads
// the pending_invites row, creates the team_members entry with the right
// role/rep_type, and marks the invite accepted. The client never has to
// know about pending_invites — it's an internal queue.
//
// Uses raw fetch against PostgREST + GoTrue rather than supabase-js so we
// don't depend on the esm.sh import (which has been flaky in the edge
// runtime).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'misconfigured' }, 500)

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'unauthorized' }, 401)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }
  const team_id = body?.team_id
  const email = body?.email?.trim()?.toLowerCase()
  const first_name = body?.first_name?.trim() || null
  const last_name = body?.last_name?.trim() || null
  const intended_role = body?.role || 'rep'
  const intended_rep_type = body?.rep_type || null

  if (!team_id || !email) return json({ error: 'missing_fields' }, 400)
  if (!['rep', 'manager', 'owner'].includes(intended_role)) {
    return json({ error: 'bad_role' }, 400)
  }
  if (intended_rep_type && !['setter', 'closer', 'both'].includes(intended_rep_type)) {
    return json({ error: 'bad_rep_type' }, 400)
  }

  // 1. Validate caller via GoTrue /user
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!userRes.ok) return json({ error: 'invalid_token' }, 401)
  const user = await userRes.json()
  const callerId = user?.id
  if (!callerId) return json({ error: 'invalid_token' }, 401)

  // 2. Confirm caller is a manager or owner of the team via PostgREST
  const tmUrl = `${SUPABASE_URL}/rest/v1/team_members?team_id=eq.${team_id}&user_id=eq.${callerId}&select=role&limit=1`
  const tmRes = await fetch(tmUrl, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  })
  if (!tmRes.ok) {
    return json({ error: 'membership_check_failed', detail: await tmRes.text() }, 500)
  }
  const tmRows = await tmRes.json()
  if (!Array.isArray(tmRows) || tmRows.length === 0) {
    return json({ error: 'not_a_member' }, 403)
  }
  const callerRole = tmRows[0].role
  if (callerRole !== 'manager' && callerRole !== 'owner') {
    return json({ error: 'not_manager' }, 403)
  }

  // 3. Upsert the pending_invites row (resolution=merge-duplicates for
  // upsert semantics on the (team_id, email) unique).
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/pending_invites?on_conflict=team_id,email`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      team_id,
      email,
      first_name,
      last_name,
      intended_role,
      intended_rep_type,
      invited_by_user_id: callerId,
      accepted_at: null,
    }),
  })
  if (!upsertRes.ok && upsertRes.status !== 201) {
    return json({ error: 'invite_record_failed', detail: await upsertRes.text() }, 500)
  }

  // 4. Send the invite via GoTrue /invite (admin endpoint). Uses the
  // service-role key as both apikey and Authorization, the same pattern
  // Supabase JS does internally.
  const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      data: { team_id, first_name, last_name, intended_role, intended_rep_type },
    }),
  })
  if (!inviteRes.ok) {
    const detail = await inviteRes.text()
    // Already-registered email is OK — the trigger still fires on next
    // sign-in (it's an after-insert trigger and consume on any insert).
    if (detail.toLowerCase().includes('already') || detail.toLowerCase().includes('registered')) {
      return json({ ok: true, warning: 'already_registered' })
    }
    return json({ error: 'invite_email_failed', detail }, 500)
  }

  return json({ ok: true })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
