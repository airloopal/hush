"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingToggleRow } from "@/components/settings/setting-toggle-row";
import { getPrivacySettings, savePrivacySettings, type PrivacySettings } from "@/lib/preferences";

export function PrivacySection() {
  const [settings, setSettings] = React.useState<PrivacySettings | null>(null);

  React.useEffect(() => {
    setSettings(getPrivacySettings());
  }, []);

  function update(patch: Partial<PrivacySettings>) {
    setSettings((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      savePrivacySettings(next);
      return next;
    });
  }

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Privacy</CardTitle>
        <CardDescription>
          Prototype toggles — Hush has no backend yet, so these control local behavior in this
          browser rather than what other accounts can see.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <SettingToggleRow
          id="privacy-online-status"
          label="Show online status"
          description="Display your presence as active/online."
          checked={settings.showOnlineStatus}
          onCheckedChange={(checked) => update({ showOnlineStatus: checked })}
        />
        <SettingToggleRow
          id="privacy-last-seen"
          label="Show last seen"
          description="Display when you were last active."
          checked={settings.showLastSeen}
          onCheckedChange={(checked) => update({ showLastSeen: checked })}
        />
        <SettingToggleRow
          id="privacy-chat-renewals"
          label="Allow chat renewals"
          description="Let expired chats be renewed for another 24 hours."
          checked={settings.allowChatRenewals}
          onCheckedChange={(checked) => update({ allowChatRenewals: checked })}
        />
        <SettingToggleRow
          id="privacy-recommendations"
          label="Allow creator recommendations"
          description="Show Sponsored and New Creators sections in Discover."
          checked={settings.allowCreatorRecommendations}
          onCheckedChange={(checked) => update({ allowCreatorRecommendations: checked })}
        />
      </CardContent>
    </Card>
  );
}
