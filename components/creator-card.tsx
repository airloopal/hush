import * as React from "react";
import { Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CreatorCardProps {
  name: string;
  handle: string;
  avatarUrl?: string;
  bio: string;
  categories: string[];
  followers: string;
  engagementRate: string;
  online?: boolean;
  featured?: boolean;
  onView?: () => void;
  className?: string;
}

/** Summary card for a creator's profile, used in discovery/browse grids. */
export function CreatorCard({
  name,
  handle,
  avatarUrl,
  bio,
  categories,
  followers,
  engagementRate,
  online,
  featured,
  onView,
  className,
}: CreatorCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden transition-shadow duration-base hover:shadow-md", className)}>
      {featured && (
        <div className="flex items-center gap-1.5 bg-violet/10 px-5 py-1.5 text-xs font-medium text-violet">
          <Sparkles className="h-3 w-3" />
          Sponsored boost
        </div>
      )}
      <CardHeader className="flex-row items-center gap-3">
        <Avatar src={avatarUrl} alt={name} size="lg" online={online} />
        <div className="flex flex-col">
          <span className="font-semibold leading-tight">{name}</span>
          <span className="text-sm text-text-secondary">@{handle}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-sm text-text-secondary">{bio}</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <CategoryPill key={c} variant={c === "18+" ? "amber" : "neutral"}>
              {c}
            </CategoryPill>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono-data text-text-primary">{followers}</span> followers
          </span>
          <span>
            <span className="font-mono-data text-text-primary">{engagementRate}</span> engagement
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onView}>
          View profile
        </Button>
      </CardFooter>
    </Card>
  );
}
