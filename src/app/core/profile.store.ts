import { Injectable, computed, inject, signal } from '@angular/core';

import {
  DuplicateProfileNameError,
  EmptyProfileNameError,
  Profile,
  ProfileDraft,
  normalizeName,
} from './model/profile';
import { ProfileRepository, StorageUnavailableError } from './persistence/profile.repository';

const UNEXPECTED_STORAGE_ERROR =
  'Beim Zugriff auf den Speicher ist ein unerwarteter Fehler aufgetreten.';

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

  /** Settles once the latest {@link load} has finished; commands wait for it. */
  private pendingLoad: Promise<void> = Promise.resolve();

  /** All profiles, newest first. */
  readonly profiles = computed(() =>
    [...this.profilesSignal()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  /** Id of the active profile, or null while there is none. */
  readonly activeId = this.activeIdSignal.asReadonly();

  readonly activeProfile = computed(
    () => this.profilesSignal().find((profile) => profile.id === this.activeIdSignal()) ?? null,
  );

  readonly hasProfiles = computed(() => this.profilesSignal().length > 0);

  /**
   * Message of the last failure to load the profiles, or null. Shown instead of failing
   * silently. Failures of {@link create} are reported to its caller instead.
   */
  readonly storageError = this.storageErrorSignal.asReadonly();

  /**
   * Loads the stored profiles. The most recently created one starts out active; from
   * there the user switches profiles through {@link activate} (US-02).
   */
  load(): Promise<void> {
    this.pendingLoad = this.fetchProfiles();
    return this.pendingLoad;
  }

  /** True if a profile with this name already exists, ignoring case and whitespace. */
  isNameTaken(name: string, exceptId?: string): boolean {
    const normalized = normalizeName(name);
    return this.profilesSignal().some(
      (profile) => profile.id !== exceptId && normalizeName(profile.name) === normalized,
    );
  }

  /**
   * Creates a profile and makes it the active one. Waits for a pending {@link load}, so
   * that the duplicate check sees every stored profile.
   *
   * @throws EmptyProfileNameError if the name is blank.
   * @throws DuplicateProfileNameError if the name is already taken. The form validates
   *   both beforehand; the checks here guard the invariants regardless of the caller.
   * @throws StorageUnavailableError if the profile could not be stored.
   */
  async create(draft: ProfileDraft): Promise<Profile> {
    await this.pendingLoad;

    const name = draft.name.trim();
    if (name === '') {
      throw new EmptyProfileNameError();
    }
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
      if (error instanceof DuplicateProfileNameError || error instanceof StorageUnavailableError) {
        throw error;
      }
      throw new StorageUnavailableError(UNEXPECTED_STORAGE_ERROR, { cause: error });
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

  private async fetchProfiles(): Promise<void> {
    try {
      const profiles = await this.repository.findAll();
      this.profilesSignal.set(profiles);
      this.storageErrorSignal.set(null);

      const newest = this.profiles()[0];
      if (newest && this.activeIdSignal() === null) {
        this.activeIdSignal.set(newest.id);
      }
    } catch (error) {
      this.storageErrorSignal.set(
        error instanceof StorageUnavailableError ? error.message : UNEXPECTED_STORAGE_ERROR,
      );
    }
  }
}
