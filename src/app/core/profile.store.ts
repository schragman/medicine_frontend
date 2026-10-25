import { Injectable, computed, inject, signal } from '@angular/core';

import { Profile, ProfileDraft, normalizeName } from './model/profile';
import { ProfileRepository, StorageUnavailableError } from './persistence/profile.repository';

/**
 * Holds the profiles of the running application and the currently active one.
 *
 * The store is the only consumer of {@link ProfileRepository}; components read its
 * signals and call its commands.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly repository = inject(ProfileRepository);

  private readonly profilesSignal = signal<readonly Profile[]>([]);
  private readonly activeIdSignal = signal<string | null>(null);
  private readonly storageErrorSignal = signal<string | null>(null);

  /** All profiles, newest first. */
  readonly profiles = computed(() =>
    [...this.profilesSignal()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  readonly activeProfile = computed(
    () => this.profilesSignal().find((profile) => profile.id === this.activeIdSignal()) ?? null,
  );

  readonly hasProfiles = computed(() => this.profilesSignal().length > 0);

  /** Message of the last storage failure, or null. Shown instead of failing silently. */
  readonly storageError = this.storageErrorSignal.asReadonly();

  /**
   * Loads the stored profiles. The most recently created one starts out active; from
   * there the user switches profiles through {@link activate} (US-02).
   */
  async load(): Promise<void> {
    try {
      const profiles = await this.repository.findAll();
      this.profilesSignal.set(profiles);
      this.storageErrorSignal.set(null);

      const newest = this.profiles()[0];
      if (newest && this.activeIdSignal() === null) {
        this.activeIdSignal.set(newest.id);
      }
    } catch (error) {
      this.reportStorageError(error);
    }
  }

  /** True if a profile with this name already exists, ignoring case and whitespace. */
  isNameTaken(name: string, exceptId?: string): boolean {
    const normalized = normalizeName(name);
    return this.profilesSignal().some(
      (profile) => profile.id !== exceptId && normalizeName(profile.name) === normalized,
    );
  }

  /**
   * Creates a profile and makes it the active one.
   *
   * @throws DuplicateProfileNameError if the name is already taken. The form validates
   *   this beforehand; the check here guards the invariant regardless of the caller.
   */
  async create(draft: ProfileDraft): Promise<Profile> {
    const name = draft.name.trim();
    if (this.isNameTaken(name)) {
      throw new DuplicateProfileNameError(name);
    }

    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      birthYear: draft.birthYear,
      bodyForm: draft.bodyForm,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.repository.save(profile);
    } catch (error) {
      this.reportStorageError(error);
      throw error;
    }

    this.profilesSignal.update((profiles) => [...profiles, profile]);
    this.activeIdSignal.set(profile.id);
    this.storageErrorSignal.set(null);
    return profile;
  }

  /** Makes this profile the active one. An unknown id is ignored (US-02 AC3). */
  activate(id: string): void {
    if (this.profilesSignal().some((profile) => profile.id === id)) {
      this.activeIdSignal.set(id);
    }
  }

  private reportStorageError(error: unknown): void {
    this.storageErrorSignal.set(
      error instanceof StorageUnavailableError
        ? error.message
        : 'Beim Zugriff auf den Speicher ist ein unerwarteter Fehler aufgetreten.',
    );
  }
}

export class DuplicateProfileNameError extends Error {
  constructor(readonly profileName: string) {
    super(`Es gibt bereits eine Silhouette mit dem Namen „${profileName}".`);
    this.name = 'DuplicateProfileNameError';
  }
}
