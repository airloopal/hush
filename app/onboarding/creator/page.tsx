"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { OnboardingShell } from "@/components/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/ui/category-pill";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useRedirectIfOnboarded } from "@/lib/use-account-guard";
import { getOnboardingState, updateOnboardingDraft } from "@/lib/account";
import { ADULT_CATEGORY, CATEGORIES, isAdultCategory, type Category } from "@/lib/categories";
import {
  PRICE_LIMITS,
  readImageAsDataUrl,
  validateBio,
  validateImageFile,
  validatePrice,
} from "@/lib/validation";

export default function CreatorDetailsPage() {
  const router = useRouter();
  const { ready } = useRedirectIfOnboarded();
  const [username, setUsername] = React.useState<string | null>(null);

  const [category, setCategory] = React.useState<Category | null>(null);
  const [bio, setBio] = React.useState("");
  const [avatarDataUrl, setAvatarDataUrl] = React.useState<string | undefined>(undefined);
  const [imageError, setImageError] = React.useState<string | undefined>(undefined);
  const [chatPrice, setChatPrice] = React.useState("");
  const [photoPrice, setPhotoPrice] = React.useState("");
  const [videoPrice, setVideoPrice] = React.useState("");
  const [adultConfirmed, setAdultConfirmed] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (!ready) return;
    const state = getOnboardingState();
    if (!state?.draft.username) {
      router.replace("/onboarding/username");
      return;
    }
    setUsername(state.draft.username);
    setCategory(state.draft.category ?? null);
    setBio(state.draft.bio ?? "");
    setAvatarDataUrl(state.draft.avatarDataUrl);
    setChatPrice(state.draft.chatPrice ?? "");
    setPhotoPrice(state.draft.photoPrice ?? "");
    setVideoPrice(state.draft.videoPrice ?? "");
    setAdultConfirmed(state.draft.adultConfirmed ?? false);
  }, [ready, router]);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.valid) {
      setImageError(result.error);
      return;
    }
    setImageError(undefined);
    const dataUrl = await readImageAsDataUrl(file);
    setAvatarDataUrl(dataUrl);
  }

  const bioValidation = validateBio(bio);
  const bioValid = bioValidation.valid;
  const chatValidation = validatePrice(chatPrice, PRICE_LIMITS.chat);
  const photoValidation = validatePrice(photoPrice, PRICE_LIMITS.photo);
  const videoValidation = validatePrice(videoPrice, PRICE_LIMITS.video);
  const wantsAdult = category ? isAdultCategory(category) : false;

  const canContinue =
    !!category &&
    bioValid &&
    chatValidation.valid &&
    photoValidation.valid &&
    videoValidation.valid &&
    (!wantsAdult || adultConfirmed);

  function handleContinue() {
    setSubmitted(true);
    if (!username || !canContinue || !category) return;

    updateOnboardingDraft("creator-preview", {
      category,
      bio: bio.trim(),
      avatarDataUrl,
      chatPrice,
      photoPrice,
      videoPrice,
      adultConfirmed: wantsAdult ? adultConfirmed : false,
    });
    router.push("/onboarding/creator/preview");
  }

  if (!ready || !username) return null;

  return (
    <OnboardingShell
      title="Set up your creator profile"
      description="Pick a category, write a short bio, and set your access pricing."
      backHref="/onboarding/username"
      step={3}
      totalSteps={4}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">Category</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((option) => (
            <CategoryPill
              key={option}
              variant={option === ADULT_CATEGORY ? "amber" : "neutral"}
              selected={category === option}
              onClick={() => setCategory(option)}
            >
              {option}
            </CategoryPill>
          ))}
        </div>
        {submitted && !category && <p className="text-xs text-danger">Choose a category.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className="text-sm font-medium text-text-primary">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Tell fans what your chats are about."
          rows={3}
          maxLength={300}
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-fast ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <p className="text-xs text-text-muted">
          {bio.trim().length}/300 characters — minimum 10.
        </p>
        {submitted && !bioValid && (
          <p className="text-xs text-danger">Bio must be 10–300 characters.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">Profile image</span>
        <div className="flex items-center gap-4">
          <Avatar src={avatarDataUrl} alt={username} size="xl" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-fast ease-signal hover:bg-surface-muted">
            <Upload className="h-4 w-4" />
            Upload image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        </div>
        <p className="text-xs text-text-muted">JPEG, PNG, or WEBP. Max 2MB. Stored locally only.</p>
        {imageError && <p className="text-xs text-danger">{imageError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="24-hour chat"
          placeholder="19.00"
          value={chatPrice}
          onChange={(event) => setChatPrice(event.target.value)}
          error={submitted && !chatValidation.valid ? chatValidation.error : undefined}
          hint={!(submitted && !chatValidation.valid) ? "$1.00–$500.00" : undefined}
        />
        <Input
          label="Live photo"
          placeholder="8.00"
          value={photoPrice}
          onChange={(event) => setPhotoPrice(event.target.value)}
          error={submitted && !photoValidation.valid ? photoValidation.error : undefined}
          hint={!(submitted && !photoValidation.valid) ? "$1.00–$1,000.00" : undefined}
        />
        <Input
          label="Live video"
          placeholder="25.00"
          value={videoPrice}
          onChange={(event) => setVideoPrice(event.target.value)}
          error={submitted && !videoValidation.valid ? videoValidation.error : undefined}
          hint={!(submitted && !videoValidation.valid) ? "$1.00–$2,500.00" : undefined}
        />
      </div>

      {wantsAdult && (
        <Card className="border-amber/30 bg-amber/5">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium text-text-primary">Adult 18+ content confirmation</p>
            <p className="text-sm text-text-secondary">
              You selected the Adult 18+ category. Confirm you are 18 years or older and that your
              content complies with Hush's lawful-adult creator policy.
            </p>
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                checked={adultConfirmed}
                onChange={(event) => setAdultConfirmed(event.target.checked)}
              />
              I confirm I am 18 years or older and this is a lawful adult creator account.
            </label>
            {submitted && !adultConfirmed && (
              <p className="text-xs text-danger">Confirmation is required for the Adult 18+ category.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Button onClick={handleContinue}>Preview profile</Button>
    </OnboardingShell>
  );
}
