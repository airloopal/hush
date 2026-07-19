export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function validateUsername(value: string): ValidationResult {
  if (!value) return { valid: false, error: "Username is required." };
  if (value.length < 3 || value.length > 20) {
    return { valid: false, error: "Username must be 3–20 characters." };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      valid: false,
      error: "Use lowercase letters, numbers, and underscores only.",
    };
  }
  return { valid: true };
}

export interface PriceRange {
  min: number;
  max: number;
}

// Stage 1 prototype: prices are validated and stored as decimal strings
// (e.g. "19.99"). Production payments must use integer minor units
// (cents) end-to-end to avoid floating point and locale rounding errors.
export const PRICE_LIMITS: Record<"chat" | "photo" | "video", PriceRange> = {
  chat: { min: 1, max: 500 },
  photo: { min: 1, max: 1000 },
  video: { min: 1, max: 2500 },
};

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

export function validatePrice(value: string, range: PriceRange): ValidationResult {
  if (!value) return { valid: false, error: "Price is required." };
  if (!DECIMAL_PATTERN.test(value)) {
    return { valid: false, error: "Enter a valid amount, e.g. 19.99." };
  }
  const amount = Number(value);
  if (amount < range.min || amount > range.max) {
    return {
      valid: false,
      error: `Must be between $${range.min.toFixed(2)} and $${range.max.toFixed(2)}.`,
    };
  }
  return { valid: true };
}

export const BIO_MIN_LENGTH = 10;
export const BIO_MAX_LENGTH = 300;

export function validateBio(value: string): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.length < BIO_MIN_LENGTH || trimmed.length > BIO_MAX_LENGTH) {
    return { valid: false, error: `Bio must be ${BIO_MIN_LENGTH}–${BIO_MAX_LENGTH} characters.` };
  }
  return { valid: true };
}

export const RESPONSE_TIME_LIMITS = { min: 1, max: 1440 };

export function validateResponseTimeMinutes(value: string): ValidationResult {
  if (!value) return { valid: false, error: "Response time is required." };
  if (!/^\d+$/.test(value)) return { valid: false, error: "Enter a whole number of minutes." };
  const minutes = Number(value);
  if (minutes < RESPONSE_TIME_LIMITS.min || minutes > RESPONSE_TIME_LIMITS.max) {
    return {
      valid: false,
      error: `Must be between ${RESPONSE_TIME_LIMITS.min} and ${RESPONSE_TIME_LIMITS.max} minutes.`,
    };
  }
  return { valid: true };
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return { valid: false, error: "Use a JPEG, PNG, or WEBP image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, error: "Image must be 2MB or smaller." };
  }
  return { valid: true };
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}
