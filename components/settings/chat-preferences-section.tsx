"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingToggleRow } from "@/components/settings/setting-toggle-row";
import { getChatPreferences, saveChatPreferences, type ChatPreferences } from "@/lib/preferences";

export function ChatPreferencesSection() {
  const [preferences, setPreferences] = React.useState<ChatPreferences | null>(null);

  React.useEffect(() => {
    setPreferences(getChatPreferences());
  }, []);

  function update(patch: Partial<ChatPreferences>) {
    setPreferences((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      saveChatPreferences(next);
      return next;
    });
  }

  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chats</CardTitle>
        <CardDescription>Tune how conversations look and behave for you.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <SettingToggleRow
          id="chat-pref-enter-to-send"
          label="Enter to send"
          description="Press Enter to send; Shift+Enter for a new line. Turn off to always use the send button."
          checked={preferences.enterToSend}
          onCheckedChange={(checked) => update({ enterToSend: checked })}
        />
        <SettingToggleRow
          id="chat-pref-timestamps"
          label="Show timestamps"
          description="Display the time under each message."
          checked={preferences.showTimestamps}
          onCheckedChange={(checked) => update({ showTimestamps: checked })}
        />
        <SettingToggleRow
          id="chat-pref-compact"
          label="Compact message spacing"
          description="Reduce spacing between messages."
          checked={preferences.compactSpacing}
          onCheckedChange={(checked) => update({ compactSpacing: checked })}
        />
        <SettingToggleRow
          id="chat-pref-autoscroll"
          label="Auto-scroll to latest"
          description="Jump to the newest message automatically when you're already caught up."
          checked={preferences.autoScroll}
          onCheckedChange={(checked) => update({ autoScroll: checked })}
        />
      </CardContent>
    </Card>
  );
}
