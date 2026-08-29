import { describe, expect, it } from "vitest";
import { validateMediaUpload, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES } from "@/lib/media-requests/upload-validation";
import { calculateCommission } from "@/lib/payments/commission-service";

describe("validateMediaUpload — live_photo", () => {
  it("accepts a normal JPEG within size limits", () => {
    expect(validateMediaUpload("live_photo", { type: "image/jpeg", size: 5_000_000 })).toEqual({ valid: true });
  });

  it("accepts PNG, WEBP, and HEIC", () => {
    for (const type of ["image/png", "image/webp", "image/heic"]) {
      expect(validateMediaUpload("live_photo", { type, size: 1000 }).valid).toBe(true);
    }
  });

  it("rejects a video file type for a photo request", () => {
    const result = validateMediaUpload("live_photo", { type: "video/mp4", size: 1000 });
    expect(result.valid).toBe(false);
  });

  it("rejects a photo exceeding the size limit", () => {
    const result = validateMediaUpload("live_photo", { type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 });
    expect(result.valid).toBe(false);
  });

  it("accepts a photo exactly at the size limit", () => {
    expect(validateMediaUpload("live_photo", { type: "image/jpeg", size: MAX_PHOTO_BYTES }).valid).toBe(true);
  });

  it("rejects an empty file", () => {
    expect(validateMediaUpload("live_photo", { type: "image/jpeg", size: 0 }).valid).toBe(false);
  });
});

describe("validateMediaUpload — live_video", () => {
  it("accepts MP4, MOV, and WEBM", () => {
    for (const type of ["video/mp4", "video/quicktime", "video/webm"]) {
      expect(validateMediaUpload("live_video", { type, size: 1000 }).valid).toBe(true);
    }
  });

  it("rejects a photo file type for a video request", () => {
    expect(validateMediaUpload("live_video", { type: "image/jpeg", size: 1000 }).valid).toBe(false);
  });

  it("rejects a video exceeding the size limit", () => {
    expect(validateMediaUpload("live_video", { type: "video/mp4", size: MAX_VIDEO_BYTES + 1 }).valid).toBe(false);
  });

  it("has a materially larger size ceiling than photos", () => {
    expect(MAX_VIDEO_BYTES).toBeGreaterThan(MAX_PHOTO_BYTES);
  });
});

describe("commission calculation — the sprint's own worked examples", () => {
  it("$10.00 live photo at default 20% commission -> $8 creator / $2 platform", () => {
    const result = calculateCommission(1000, 2000);
    expect(result.platformFeeMinor).toBe(200);
    expect(result.creatorNetMinor).toBe(800);
  });

  it("$20.00 live video at default 20% commission -> $16 creator / $4 platform", () => {
    const result = calculateCommission(2000, 2000);
    expect(result.platformFeeMinor).toBe(400);
    expect(result.creatorNetMinor).toBe(1600);
  });

  it("a Founding Creator's 10% override still applies to media requests (not just chat)", () => {
    const photoResult = calculateCommission(1000, 1000);
    expect(photoResult.platformFeeMinor).toBe(100);
    expect(photoResult.creatorNetMinor).toBe(900);

    const videoResult = calculateCommission(2000, 1000);
    expect(videoResult.platformFeeMinor).toBe(200);
    expect(videoResult.creatorNetMinor).toBe(1800);
  });
});
