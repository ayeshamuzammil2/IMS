import { z } from 'zod';

/** Mirrors backend/src/PIA.Application/Options/PasswordPolicyOptions.cs defaults - keep in sync. */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  key: string;
  label: string;
  /** Short form used in the concise one-line hint, e.g. "Add: 8+ characters, uppercase". */
  shortLabel: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    key: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    shortLabel: `${PASSWORD_MIN_LENGTH}+ characters`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  { key: 'upper', label: 'One uppercase letter', shortLabel: 'uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'One lowercase letter', shortLabel: 'lowercase', test: (pw) => /[a-z]/.test(pw) },
  { key: 'digit', label: 'One number', shortLabel: 'a number', test: (pw) => /[0-9]/.test(pw) },
  { key: 'symbol', label: 'One special character', shortLabel: 'a symbol', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/** Mirrors the "must not contain name" check in PasswordPolicyService.cs - any name part 3+ chars. */
export function containsName(password: string, fullName?: string | null): boolean {
  if (!password || !fullName) return false;
  const parts = fullName.split(/\s+/).filter((p) => p.length >= 3);
  const lower = password.toLowerCase();
  return parts.some((part) => lower.includes(part.toLowerCase()));
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine((pw) => /[A-Z]/.test(pw), { message: 'Password must contain an uppercase letter.' })
  .refine((pw) => /[a-z]/.test(pw), { message: 'Password must contain a lowercase letter.' })
  .refine((pw) => /[0-9]/.test(pw), { message: 'Password must contain a number.' })
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), { message: 'Password must contain a special character.' });
