import { isReservedUsername } from "@/lib/auth/reserved-usernames";
import type { ValidationResult } from "@/lib/validation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function validateEmail(value: string): ValidationResult {
  if (!value) return { valid: false, error: "Email is required." };
  if (!EMAIL_PATTERN.test(value.trim())) return { valid: false, error: "Enter a valid email address." };
  return { valid: true };
}

export function validateSignupUsername(value: string): ValidationResult {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { valid: false, error: "Username is required." };
  if (!USERNAME_PATTERN.test(normalized)) {
    return { valid: false, error: "3–20 characters: lowercase letters, numbers, underscores." };
  }
  if (isReservedUsername(normalized)) {
    return { valid: false, error: "That username is reserved. Choose another." };
  }
  return { valid: true };
}

/** Deliberately modest strength bar (matches what Supabase's own default
 * password policy expects) — length + a mix of character classes, not a
 * full entropy scorer. */
export function validatePasswordStrength(value: string): ValidationResult {
  if (!value) return { valid: false, error: "Password is required." };
  if (value.length < 8) return { valid: false, error: "Use at least 8 characters." };
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumberOrSymbol = /[0-9\W]/.test(value);
  if (!hasLetter || !hasNumberOrSymbol) {
    return { valid: false, error: "Mix letters with at least one number or symbol." };
  }
  return { valid: true };
}

export function validatePasswordsMatch(password: string, confirm: string): ValidationResult {
  if (password !== confirm) return { valid: false, error: "Passwords don't match." };
  return { valid: true };
}

/** True only for a date strictly 18 or more years before today. */
export function isAtLeast18(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return dob.getTime() <= eighteenYearsAgo.getTime();
}

export function validateDateOfBirth(value: string): ValidationResult {
  if (!value) return { valid: false, error: "Date of birth is required." };
  if (!isAtLeast18(value)) return { valid: false, error: "You must be at least 18 years old to use Hush." };
  return { valid: true };
}
