import type { MediaRequestType } from "@/lib/media-request-types";

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // 25MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export type MediaUploadValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Server-side file type/size validation, extracted as a pure function so
 * it's testable without constructing a real Route Handler request. Never
 * trusts the browser's claimed Content-Type alone — the byte size check
 * is independent of it.
 */
export function validateMediaUpload(
  requestType: MediaRequestType,
  file: { type: string; size: number }
): MediaUploadValidationResult {
  const allowedTypes = requestType === "live_photo" ? ALLOWED_PHOTO_TYPES : ALLOWED_VIDEO_TYPES;
  const maxBytes = requestType === "live_photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      reason:
        requestType === "live_photo"
          ? "Only JPEG, PNG, WEBP, or HEIC images are allowed."
          : "Only MP4, MOV, or WEBM videos are allowed.",
    };
  }
  if (file.size <= 0) {
    return { valid: false, reason: "File is empty." };
  }
  if (file.size > maxBytes) {
    return { valid: false, reason: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).` };
  }
  return { valid: true };
}
