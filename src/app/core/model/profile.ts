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

/** True if a profile other than `exceptId` already uses this name (AC4). */
export function isNameTakenIn(
  profiles: readonly Profile[],
  name: string,
  exceptId?: string,
): boolean {
  const normalized = normalizeName(name);
  return profiles.some(
    (profile) => profile.id !== exceptId && normalizeName(profile.name) === normalized,
  );
}

export const NAME_REQUIRED_MESSAGE = 'Bitte geben Sie einen Namen ein.';

/** Thrown when a profile name is already taken (AC4). */
export class DuplicateProfileNameError extends Error {
  constructor(readonly profileName: string) {
    super(`Es gibt bereits eine Silhouette mit dem Namen „${profileName}".`);
    this.name = 'DuplicateProfileNameError';
  }
}

/** Thrown when a profile is to be changed that has been deleted in the meantime. */
export class ProfileNotFoundError extends Error {
  constructor() {
    super('Diese Silhouette gibt es nicht mehr. Sie wurde vermutlich in einem anderen Fenster gelöscht.');
    this.name = 'ProfileNotFoundError';
  }
}

/** Thrown when a profile name is empty or consists of whitespace only. */
export class EmptyProfileNameError extends Error {
  constructor() {
    super(NAME_REQUIRED_MESSAGE);
    this.name = 'EmptyProfileNameError';
  }
}
