import { Injectable } from '@angular/core';

import {
  BODY_FORMS,
  BodyForm,
  DEFAULT_BODY_FORM,
  DuplicateProfileNameError,
  Profile,
  isNameTakenIn,
} from '../model/profile';
import { ProfileRepository, StorageUnavailableError } from './profile.repository';

const STORAGE_KEY = 'medicin.profiles';

/**
 * Version of the stored payload. Raise it when the shape of {@link StoredProfiles}
 * changes and add a migration in {@link migrate}.
 */
const SCHEMA_VERSION = 1;

interface StoredProfiles {
  schemaVersion: number;
  profiles: Profile[];
}

/**
 * Browser-local implementation of {@link ProfileRepository} — the only place in the
 * application that touches `localStorage` (US-11, AC3).
 */
@Injectable()
export class LocalStorageProfileRepository extends ProfileRepository {
  async findAll(): Promise<Profile[]> {
    return this.read().profiles;
  }

  /**
   * Checks the name against the profiles just read rather than against a caller's
   * snapshot, so that two open tabs cannot store the same name (AC4).
   */
  async save(profile: Profile): Promise<void> {
    const profiles = this.read().profiles;
    if (isNameTakenIn(profiles, profile.name, profile.id)) {
      throw new DuplicateProfileNameError(profile.name);
    }
    const index = profiles.findIndex((candidate) => candidate.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    this.write(profiles);
  }

  async delete(id: string): Promise<void> {
    const remaining = this.read().profiles.filter((profile) => profile.id !== id);
    this.write(remaining);
  }

  private read(): StoredProfiles {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (cause) {
      // Private browsing or a blocking cookie policy can make localStorage unreadable.
      throw new StorageUnavailableError(
        'Der lokale Speicher des Browsers ist nicht verfügbar.',
        { cause },
      );
    }

    if (raw === null) {
      return { schemaVersion: SCHEMA_VERSION, profiles: [] };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new StorageUnavailableError(
        'Die gespeicherten Daten konnten nicht gelesen werden.',
        { cause },
      );
    }

    return migrate(parsed);
  }

  private write(profiles: Profile[]): void {
    const payload: StoredProfiles = { schemaVersion: SCHEMA_VERSION, profiles };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (cause) {
      // Most likely a full quota — the caller has to tell the user (US-11, AC5).
      throw new StorageUnavailableError(
        'Die Daten konnten nicht gespeichert werden. Möglicherweise ist der Speicher des Browsers voll.',
        { cause },
      );
    }
  }
}

/**
 * Brings a stored payload of any known version into the current shape. Unknown or
 * malformed content is rejected rather than silently dropped, so that a bug cannot
 * quietly erase a user's data.
 */
function migrate(parsed: unknown): StoredProfiles {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new StorageUnavailableError('Die gespeicherten Daten haben ein unbekanntes Format.');
  }

  const { schemaVersion, profiles } = parsed as Partial<StoredProfiles>;

  if (schemaVersion !== SCHEMA_VERSION) {
    throw new StorageUnavailableError(
      `Die gespeicherten Daten stammen aus Version ${schemaVersion ?? 'unbekannt'} und können nicht gelesen werden.`,
    );
  }

  if (!Array.isArray(profiles) || !profiles.every(isStoredProfile)) {
    throw new StorageUnavailableError('Die gespeicherten Daten sind unvollständig.');
  }

  // Profiles stored before the body form existed get the default one.
  return {
    schemaVersion,
    profiles: profiles.map((profile) => ({
      ...profile,
      bodyForm: profile.bodyForm ?? DEFAULT_BODY_FORM,
    })),
  };
}

/** A stored profile; the body form may be missing in profiles stored before it existed. */
type StoredProfile = Omit<Profile, 'bodyForm'> & { readonly bodyForm?: BodyForm };

function isStoredProfile(candidate: unknown): candidate is StoredProfile {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const profile = candidate as Partial<StoredProfile>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.createdAt === 'string' &&
    (profile.birthYear === null || typeof profile.birthYear === 'number') &&
    BODY_FORMS.includes(profile.bodyForm ?? DEFAULT_BODY_FORM)
  );
}
