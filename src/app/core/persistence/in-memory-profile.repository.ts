import { Injectable } from '@angular/core';

import { DuplicateProfileNameError, Profile } from '../model/profile';
import { ProfileRepository, isNameTakenIn } from './profile.repository';

/**
 * Test double for {@link ProfileRepository}. Keeps profiles in memory so unit tests do
 * not depend on a browser storage implementation.
 */
@Injectable()
export class InMemoryProfileRepository extends ProfileRepository {
  private profiles: Profile[] = [];

  async findAll(): Promise<Profile[]> {
    return [...this.profiles];
  }

  async save(profile: Profile): Promise<void> {
    if (isNameTakenIn(this.profiles, profile)) {
      throw new DuplicateProfileNameError(profile.name);
    }
    const index = this.profiles.findIndex((candidate) => candidate.id === profile.id);
    if (index >= 0) {
      this.profiles[index] = profile;
    } else {
      this.profiles.push(profile);
    }
  }

  async delete(id: string): Promise<void> {
    this.profiles = this.profiles.filter((profile) => profile.id !== id);
  }
}
