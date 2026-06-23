// Supabase Edge Function: invite-rep
//
// Called by the manager portal when an owner/manager fills out the Invite
// modal. We:
//   1. Validate the caller is a manager or owner of the target team.
//   2. Upsert a pending_invites row with the intended role + rep_type.
//   3. Email the recipient a Supabase Auth magic-link via
//      supabase.auth.admin.inviteUserByEmail.
//
// On first sign-in, the consume_pending_invites_after_signup trigger reads
// the pending_invites row, creates the team_members entry with the right
// role/rep_type, and marks the invite accepted. The client never has to
// know about pending_invites — it's an internal queue.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'unauthorized' }, 401)

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }
  const team_id: string | undefined = body?.team_id
  const email: string | undefined = body?.email?.trim()?.toLowerCase()
  const first_name: string | undefined = body?.first_name?.trim() || null
  const last_name: string | undefined = body?.last_name?.trim() || null
  const intended_role: string = body?.role || 'rep'
  const intended_rep_type: string | null = body?.rep_type || null

  if (!team_id || !email) return json({ error: 'missing_fields' }, 400)
  if (!['rep', 'manager', 'owner'].includes(intended_role)) {
    return json({ error: 'bad_role' }, 400)
  }
  if (intended_rep_type && !['setter', 'closer', 'both'].includes(intended_rep_type)) {
    return json({ error: 'bad_rep_type' }, 400)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Validate caller
  const { data: userRes, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userRes?.user) return json({ error: 'invalid_token' }, 401)
  const callerId = userRes.user.id

  // Caller must be a manager or owner of the target team
  const { data: tmRows, error: tmErr } = await admin
    .from('team_members')
    .select('role')
    .eq('team_id', team_id)
    .eq('user_id', callerId)
    .limit(1)
  if (tmErr) return json({ error: 'membership_check_failed', detail: tmErr.message }, 500)
  if (!tmRows || tmRows.length === 0) return json({ error: 'not_a_member' }, 403)
  const callerRole = tmRows[0].role
  if (callerRole !== 'manager' && callerRole !== 'owner') {
    return json({ error: 'not_manager' }, 403)
  }

  // Queue the invite. Idempotent: if the same email was invited before,
  // update the queued role / rep_type so the most recent invite wins.
  const { error: piErr } = await admin
    .from('pending_invites')
    .upsert({
      team_id,
      email,
      first_name,
      last_name,
      intended_role,
      intended_rep_type,
      invited_by_user_id: callerId,
      accepted_at: null,
    }, { onConflict: 'team_id,email' })
  if (piErr) return json({ error: 'invite_record_failed', detail: piErr.message }, 500)

  // Send the email. Use inviteUserByEmail which sends a magic-link the
  // recipient can click to sign in. Once they do, the database trigger
  // creates their team_members row.
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { team_id, first_name, last_name, intended_role, intended_rep_type },
  })
  if (emailErr) {
    // Already-registered email is OK — they have an account, the trigger
    // will still consume the pending invite when they next sign in (since
    // it fires on every auth.users insert, not just first signup). For
    // already-existing users, surface a softer warning so the manager can
    // tell the rep to sign in if they haven't already.
    const msg = String(emailErr.message).toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      return json({ ok: true, warning: 'already_registered' })
    }
    return json({ error: 'invite_email_failed', detail: emailErr.message }, 500)
  }

  return json({ ok: true })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
