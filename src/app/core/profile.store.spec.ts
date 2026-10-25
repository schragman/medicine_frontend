import { TestBed } from '@angular/core/testing';

import { DEFAULT_BODY_FORM, ProfileDraft } from './model/profile';
import { InMemoryProfileRepository } from './persistence/in-memory-profile.repository';
import { ProfileRepository } from './persistence/profile.repository';
import { DuplicateProfileNameError, ProfileStore } from './profile.store';

function draft(name: string): ProfileDraft {
  return { name, birthYear: null, bodyForm: DEFAULT_BODY_FORM };
}

describe('ProfileStore', () => {
  let store: ProfileStore;
  let repository: InMemoryProfileRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InMemoryProfileRepository,
        { provide: ProfileRepository, useExisting: InMemoryProfileRepository },
      ],
    });
    repository = TestBed.inject(InMemoryProfileRepository);
    store = TestBed.inject(ProfileStore);
  });

  it('makes a newly created profile the active one (AC5)', async () => {
    const profile = await store.create(draft('Anna'));

    expect(store.activeProfile()).toEqual(profile);
    expect(store.hasProfiles()).toBe(true);
  });

  it('trims the name before storing it', async () => {
    const profile = await store.create(draft('  Anna  '));

    expect(profile.name).toBe('Anna');
  });

  it('rejects a duplicate name regardless of case and whitespace (AC4)', async () => {
    await store.create(draft('Anna'));

    expect(store.isNameTaken('anna ')).toBe(true);
    await expect(store.create(draft('ANNA'))).rejects.toThrow(DuplicateProfileNameError);
  });

  it('persists the profile through the repository', async () => {
    await store.create(draft('Anna'));

    expect((await repository.findAll()).map((profile) => profile.name)).toEqual(['Anna']);
  });

  it('loads stored profiles newest first and activates the newest', async () => {
    await repository.save({
      id: '1',
      name: 'Anna',
      birthYear: null,
      bodyForm: 'NEUTRAL',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await repository.save({
      id: '2',
      name: 'Bea',
      birthYear: 1988,
      bodyForm: 'FEMALE',
      createdAt: '2026-02-01T00:00:00.000Z',
    });

    await store.load();

    expect(store.profiles().map((profile) => profile.name)).toEqual(['Bea', 'Anna']);
    expect(store.activeProfile()?.name).toBe('Bea');
  });

  it('surfaces a storage failure instead of failing silently', async () => {
    vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Speicher voll'));

    await expect(store.create(draft('Anna'))).rejects.toThrow();
    expect(store.storageError()).not.toBeNull();
  });
});
