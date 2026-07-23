import Link from "next/link";
import { Compass } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container flex min-h-[60vh] items-center justify-center py-16">
        <h1 className="sr-only">Page not found — Hush</h1>
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The page you're looking for doesn't exist or may have moved."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          }
        />
      </main>
      <LandingFooter />
    </div>
  );
}
