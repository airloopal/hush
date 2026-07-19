"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingToggleRow } from "@/components/settings/setting-toggle-row";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/preferences";

export function NotificationsSection() {
  const [preferences, setPreferences] = React.useState<NotificationPreferences | null>(null);

  React.useEffect(() => {
    setPreferences(getNotificationPreferences());
  }, []);

  function update(patch: Partial<NotificationPreferences>) {
    setPreferences((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      saveNotificationPreferences(next);
      return next;
    });
  }

  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notifications</CardTitle>
        <CardDescription>Choose what creates a notification. Local only — no push notifications.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="divide-y divide-border">
          <SettingToggleRow
            id="notif-pref-creator-reply"
            label="Creator replies"
            checked={preferences.notifyOnCreatorReply}
            onCheckedChange={(checked) => update({ notifyOnCreatorReply: checked })}
          />
          <SettingToggleRow
            id="notif-pref-expiry"
            label="Chat expiry warnings"
            checked={preferences.notifyOnExpiryWarning}
            onCheckedChange={(checked) => update({ notifyOnExpiryWarning: checked })}
          />
          <SettingToggleRow
            id="notif-pref-media"
            label="Media fulfilled"
            checked={preferences.notifyOnMediaFulfilled}
            onCheckedChange={(checked) => update({ notifyOnMediaFulfilled: checked })}
          />
        </div>
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
            Open Notification Centre
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
