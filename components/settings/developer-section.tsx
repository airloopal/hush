"use client";

import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DeveloperSection({ onReset }: { onReset: () => void }) {
  return (
    <Card className="border-danger/30">
      <CardHeader>
        <CardTitle className="text-base">Developer</CardTitle>
        <CardDescription>
          Local-only. Clears all Hush data from this browser (account, chats, notifications,
          purchases, trust & safety records) and restarts onboarding. Not available in production
          builds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Reset local account
        </Button>
      </CardContent>
    </Card>
  );
}
