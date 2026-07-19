"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/ui/category-pill";
import { useToast } from "@/components/ui/use-toast";
import { saveAccount } from "@/lib/account";
import { ADULT_CATEGORY, CATEGORIES, type Category } from "@/lib/categories";
import {
  PRICE_LIMITS,
  RESPONSE_TIME_LIMITS,
  validateBio,
  validatePrice,
  validateResponseTimeMinutes,
} from "@/lib/validation";
import type { Account } from "@/lib/types";

export interface ProfileSectionProps {
  account: Account;
  onAccountChange: (account: Account) => void;
}

export function ProfileSection({ account, onAccountChange }: ProfileSectionProps) {
  const [editing, setEditing] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription className="capitalize">@{account.username} · {account.role} account</CardDescription>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          account.role === "fan" ? (
            <FanProfileEditor
              account={account}
              onCancel={() => setEditing(false)}
              onSaved={(next) => {
                onAccountChange(next);
                setEditing(false);
              }}
            />
          ) : (
            <CreatorProfileEditor
              account={account}
              onCancel={() => setEditing(false)}
              onSaved={(next) => {
                onAccountChange(next);
                setEditing(false);
              }}
            />
          )
        ) : account.role === "fan" ? (
          <div className="flex flex-wrap gap-1.5">
            {account.interests.map((interest) => (
              <CategoryPill key={interest} variant={interest === ADULT_CATEGORY ? "amber" : "neutral"}>
                {interest}
              </CategoryPill>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <CategoryPill variant={account.isAdult ? "amber" : "neutral"} className="w-fit">
              {account.category}
            </CategoryPill>
            <p className="text-sm text-text-secondary">{account.bio}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-text-muted">24h chat</dt>
                <dd className="font-mono-data font-medium">${account.pricing.chatPrice}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Live photo</dt>
                <dd className="font-mono-data font-medium">${account.pricing.photoPrice}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Live video</dt>
                <dd className="font-mono-data font-medium">${account.pricing.videoPrice}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Avg. response</dt>
                <dd className="font-medium">{account.responseTimeMinutes ?? "—"} min</dd>
              </div>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FanProfileEditor({
  account,
  onCancel,
  onSaved,
}: {
  account: Extract<Account, { role: "fan" }>;
  onCancel: () => void;
  onSaved: (account: Account) => void;
}) {
  const { toast } = useToast();
  const [interests, setInterests] = React.useState<Category[]>(account.interests);
  const [adultConfirmed, setAdultConfirmed] = React.useState(account.adultConfirmed);
  const [submitted, setSubmitted] = React.useState(false);

  const wantsAdult = interests.includes(ADULT_CATEGORY);
  const canSave = interests.length > 0 && (!wantsAdult || adultConfirmed);

  function toggleInterest(category: Category) {
    setInterests((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  }

  function handleSave() {
    setSubmitted(true);
    if (!canSave) return;
    const next: Account = {
      ...account,
      interests,
      adultConfirmed: wantsAdult ? adultConfirmed : false,
      adultConfirmedAt: wantsAdult && adultConfirmed ? account.adultConfirmedAt ?? new Date().toISOString() : undefined,
    };
    saveAccount(next);
    toast({ title: "Profile updated", description: "Your interests have been saved.", variant: "success" });
    onSaved(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <CategoryPill
            key={category}
            variant={category === ADULT_CATEGORY ? "amber" : "neutral"}
            selected={interests.includes(category)}
            onClick={() => toggleInterest(category)}
          >
            {category}
          </CategoryPill>
        ))}
      </div>
      {submitted && interests.length === 0 && (
        <p className="text-xs text-danger">Pick at least one interest.</p>
      )}

      {wantsAdult && (
        <div className="flex flex-col gap-2 rounded-md border border-amber/30 bg-amber/5 p-3">
          <label className="flex items-start gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
              checked={adultConfirmed}
              onChange={(event) => setAdultConfirmed(event.target.checked)}
            />
            I confirm I am 18 years or older and want to see Adult 18+ creators.
          </label>
          {submitted && !adultConfirmed && (
            <p className="text-xs text-danger">Confirmation is required to include Adult 18+.</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save changes</Button>
      </div>
    </div>
  );
}

function CreatorProfileEditor({
  account,
  onCancel,
  onSaved,
}: {
  account: Extract<Account, { role: "creator" }>;
  onCancel: () => void;
  onSaved: (account: Account) => void;
}) {
  const { toast } = useToast();
  const [bio, setBio] = React.useState(account.bio);
  const [chatPrice, setChatPrice] = React.useState(account.pricing.chatPrice);
  const [photoPrice, setPhotoPrice] = React.useState(account.pricing.photoPrice);
  const [videoPrice, setVideoPrice] = React.useState(account.pricing.videoPrice);
  const [responseTime, setResponseTime] = React.useState(String(account.responseTimeMinutes ?? 15));
  const [submitted, setSubmitted] = React.useState(false);

  const bioValidation = validateBio(bio);
  const chatValidation = validatePrice(chatPrice, PRICE_LIMITS.chat);
  const photoValidation = validatePrice(photoPrice, PRICE_LIMITS.photo);
  const videoValidation = validatePrice(videoPrice, PRICE_LIMITS.video);
  const responseValidation = validateResponseTimeMinutes(responseTime);

  const canSave =
    bioValidation.valid &&
    chatValidation.valid &&
    photoValidation.valid &&
    videoValidation.valid &&
    responseValidation.valid;

  function handleSave() {
    setSubmitted(true);
    if (!canSave) return;
    const next: Account = {
      ...account,
      bio: bio.trim(),
      pricing: { chatPrice, photoPrice, videoPrice },
      responseTimeMinutes: Number(responseTime),
    };
    saveAccount(next);
    toast({ title: "Profile updated", description: "Your bio and pricing have been saved.", variant: "success" });
    onSaved(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-bio" className="text-sm font-medium text-text-primary">
          Bio
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={3}
          maxLength={300}
          className="flex w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors duration-fast ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {submitted && !bioValidation.valid && <p className="text-xs text-danger">{bioValidation.error}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="24-hour chat"
          value={chatPrice}
          onChange={(event) => setChatPrice(event.target.value)}
          error={submitted && !chatValidation.valid ? chatValidation.error : undefined}
        />
        <Input
          label="Live photo"
          value={photoPrice}
          onChange={(event) => setPhotoPrice(event.target.value)}
          error={submitted && !photoValidation.valid ? photoValidation.error : undefined}
        />
        <Input
          label="Live video"
          value={videoPrice}
          onChange={(event) => setVideoPrice(event.target.value)}
          error={submitted && !videoValidation.valid ? videoValidation.error : undefined}
        />
      </div>

      <Input
        label="Average response time (minutes)"
        value={responseTime}
        onChange={(event) => setResponseTime(event.target.value)}
        error={submitted && !responseValidation.valid ? responseValidation.error : undefined}
        hint={
          submitted && !responseValidation.valid
            ? undefined
            : `${RESPONSE_TIME_LIMITS.min}–${RESPONSE_TIME_LIMITS.max} minutes`
        }
        className="max-w-xs"
      />

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save changes</Button>
      </div>
    </div>
  );
}
