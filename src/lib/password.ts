export const MIN_PASSWORD_LENGTH = 8;

/**
 * Supabase's leaked-password check against HaveIBeenPwned is a paid feature,
 * so this is the free stand-in: a length floor plus the handful of passwords
 * that actually get chosen when a team signs up in a hurry. Enforced here
 * rather than only on the input, since the form field is trivially bypassed.
 */
const WEAK_PASSWORDS = new Set([
  "passwort", "password", "12345678", "123456789", "1234567890",
  "qwertz123", "qwerty123", "passwort1", "password1", "bardickefranz",
  "dickefranz", "franz123", "willkommen", "hallo123", "admin123",
]);

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "Dieses Passwort ist zu leicht zu erraten. Bitte ein anderes waehlen.";
  }
  return null;
}
