"use client";

import * as React from "react";
import { getAccount } from "@/lib/account";
import { getUnreadNotificationCount, NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notifications";

/** Live unread count for the nav bar / bottom nav badges. Recomputes on
 * mount and whenever notifications change in this tab (or another tab, via
 * the native "storage" event) — no polling, no global store. */
export function useUnreadNotificationCount(): number {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    function refresh() {
      const account = getAccount();
      setCount(account ? getUnreadNotificationCount(account.username) : 0);
    }
    refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return count;
}
