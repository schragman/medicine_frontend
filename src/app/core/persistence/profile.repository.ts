import { Profile, normalizeName } from '../model/profile';

/**
 * Access to stored profiles. Components depend on this abstraction only, never on a
 * concrete storage technology, so the browser implementation can be swapped for an
 * HTTP one without touching them (NFR-4).
 *
 * The signatures are asynchronous even though the current implementation is not — that
 * keeps the later switch free of call-site changes.
 */
export abstract class ProfileRepository {
  abstract findAll(): Promise<Profile[]>;

  /**
   * Inserts or replaces the profile.
   *
   * @throws DuplicateProfileNameError if another stored profile has the same name.
   */
  abstract save(profile: Profile): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

/**
 * Thrown when the underlying storage cannot be read or written — unavailable, full or
 * corrupted. Callers surface this instead of losing data silently (US-11, AC5).
 */
/** True if a profile other than this one already uses its name. For implementations. */
export function isNameTakenIn(profiles: readonly Profile[], profile: Profile): boolean {
  const normalized = normalizeName(profile.name);
  return profiles.some(
    (candidate) => candidate.id !== profile.id && normalizeName(candidate.name) === normalized,
  );
}

export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageUnavailableError';
  }
}
