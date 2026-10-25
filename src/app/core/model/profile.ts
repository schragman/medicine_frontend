/**
 * A profile is a named person whose health status is documented.
 * The UI calls it "Silhouette".
 */
export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly birthYear: number | null;
  readonly bodyForm: BodyForm;
  /** ISO-8601 timestamp */
  readonly createdAt: string;
}

/** User input for creating or editing a profile — without generated fields. */
export interface ProfileDraft {
  readonly name: string;
  readonly birthYear: number | null;
  readonly bodyForm: BodyForm;
}

export type BodyForm = 'NEUTRAL' | 'FEMALE' | 'MALE';

export const BODY_FORMS: readonly BodyForm[] = ['NEUTRAL', 'FEMALE', 'MALE'];

export const DEFAULT_BODY_FORM: BodyForm = 'NEUTRAL';

/** German labels — the UI language is German, the code is English (NFR-1). */
export const BODY_FORM_LABELS: Readonly<Record<BodyForm, string>> = {
  NEUTRAL: 'neutral',
  FEMALE: 'weiblich',
  MALE: 'männlich',
};

/**
 * Profile names are unique. Comparison ignores case and surrounding whitespace so
 * that "Anna" and "anna " are not accepted side by side.
 */
export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('de-DE');
}
