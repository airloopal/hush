/**
 * This file previously implemented an obsolete ConversationRepository
 * shape (listForFan/listForCreator/getById, from Phase 2.1A). The
 * interface was redesigned in Launch Sprint L3 — see
 * lib/repositories/conversation-repository.ts for the current shape
 * (createConversation/getConversation/getConversationByUsers/
 * getUserConversations/updateLatestMessage/archiveConversation) and
 * lib/repositories/demo/demo-conversation-engine.ts for the actual demo
 * implementation, which adapts the existing lib/chat.ts session storage
 * (a fan/creator pair = a conversation; each ChatSession record for that
 * pair = a session) into ConversationSummary rather than introducing a
 * second, parallel demo data store.
 *
 * This file now just re-exports that implementation, so anything still
 * importing from this path (its original location) gets the current,
 * correct repository rather than the obsolete one.
 */
export { demoConversationRepository } from "@/lib/repositories/demo/demo-conversation-engine";
