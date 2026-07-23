-- Security finding from this sprint's RLS/ownership review of payment
-- activation: conversation_sessions_insert_as_fan (added in
-- 20260701000016_conversation_security.sql, before payments existed)
-- still let any authenticated fan INSERT a conversation_sessions row
-- directly for their own conversation — via the Supabase client SDK,
-- completely bypassing checkout and the webhook entirely. That was
-- reasonable when session creation genuinely was self-service (pre-L5);
-- now that a real, paid activation path exists
-- (lib/payments/webhook-handler.ts, using the service-role client), it's
-- a real payment-bypass vulnerability — nothing currently legitimate
-- depends on the client-side insert path (verified: the only real-mode UI
-- code that touches ConversationSessionRepository only ever calls
-- getActiveSession, never createSession/renewSession), so removing it is
-- safe and closes the gap.
--
-- Fans keep read access (conversation_sessions_select_participant, from
-- the same original migration, is untouched) — they can still see their
-- own session's countdown/status. They just can no longer create one
-- themselves; only the payment webhook (service-role, bypasses RLS
-- entirely) or an admin can.
drop policy if exists conversation_sessions_insert_as_fan on public.conversation_sessions;
revoke insert on public.conversation_sessions from authenticated;

comment on table public.conversation_sessions is
  'One row per 24-hour access window. Renewing INSERTs a new row — existing rows are never overwritten, so full unlock/renewal history is preserved per conversation. Sessions are ONLY ever created by the payment webhook handler (service-role) after a verified paid event, or by an admin — authenticated clients have no INSERT path (see 20260701000023). "status" is the recorded intent (pending/active/refunded); whether a session is *currently* active for gating purposes is always also re-checked against expires_at at read time (see ConversationSessionService.isActive).';
