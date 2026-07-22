"use client";

import { isDemoMode } from "@/lib/auth/mode";
import { demoMessageRepository } from "@/lib/repositories/demo/demo-message-repository";
import { supabaseMessageRepositoryBrowser } from "@/lib/repositories/supabase/message-repository-browser";
import type { MessageRepository } from "@/lib/repositories/message-repository";

export function getClientMessageRepository(): MessageRepository {
  return isDemoMode() ? demoMessageRepository : supabaseMessageRepositoryBrowser;
}
