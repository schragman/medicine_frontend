import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_BODY_FORM,
  DuplicateProfileNameError,
  EmptyProfileNameError,
  ProfileDraft,
} from './model/profile';
import { InMemoryProfileRepository } from './persistence/in-memory-profile.repository';
import { ProfileRepository, StorageUnavailableError } from './persistence/profile.repository';
import { ProfileStore } from './profile.store';

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

  it('rejects a name of whitespace only', async () => {
    await expect(store.create(draft('   '))).rejects.toThrow(EmptyProfileNameError);
    expect(store.hasProfiles()).toBe(false);
  });

  it('checks duplicates against stored profiles while loading is still pending', async () => {
    await repository.save({
      id: '1',
      name: 'Anna',
      birthYear: null,
      bodyForm: 'NEUTRAL',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const loading = store.load();
    await expect(store.create(draft('anna'))).rejects.toThrow(DuplicateProfileNameError);
    await loading;

    expect(store.profiles().map((profile) => profile.name)).toEqual(['Anna']);
  });

  it('keeps a profile created while loading is still pending', async () => {
    const loading = store.load();
    await store.create(draft('Bea'));
    await loading;

    expect(store.profiles().map((profile) => profile.name)).toEqual(['Bea']);
  });

  it('lists a profile once even if a load picks it up while it is being saved', async () => {
    const save = repository.save.bind(repository);
    vi.spyOn(repository, 'save').mockImplementationOnce(async (profile) => {
      await save(profile);
      await store.load();
    });

    const profile = await store.create(draft('Anna'));

    expect(store.profiles()).toEqual([profile]);
  });

  it('shows a name stored elsewhere once saving it here has been rejected', async () => {
    await store.load();
    // Stored by another tab after this one had loaded.
    await repository.save({
      id: 'other-tab',
      name: 'Anna',
      birthYear: null,
      bodyForm: 'NEUTRAL',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(store.create(draft('anna'))).rejects.toThrow(DuplicateProfileNameError);

    expect(store.isNameTaken('anna')).toBe(true);
    expect(store.profiles().map((profile) => profile.name)).toEqual(['Anna']);
  });

  it('keeps reporting a failed load after a profile has been created', async () => {
    vi.spyOn(repository, 'findAll').mockRejectedValueOnce(new Error('kaputt'));
    await store.load();

    await store.create(draft('Anna'));

    expect(store.storageError()).not.toBeNull();
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

  it('switches the active profile (US-02 AC3)', async () => {
    const anna = await store.create(draft('Anna'));
    await store.create(draft('Bea'));

    store.activate(anna.id);

    expect(store.activeProfile()).toEqual(anna);
  });

  it('keeps the active profile when the id is unknown', async () => {
    const anna = await store.create(draft('Anna'));

    store.activate('does-not-exist');

    expect(store.activeProfile()).toEqual(anna);
  });

  it('reports a storage failure on create to the caller instead of failing silently', async () => {
    vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Speicher voll'));

    await expect(store.create(draft('Anna'))).rejects.toThrow(StorageUnavailableError);
    // Shown by the caller only, so that it is not announced twice (once per alert).
    expect(store.storageError()).toBeNull();
    expect(store.hasProfiles()).toBe(false);
  });

  it('surfaces a failure to load instead of failing silently', async () => {
    vi.spyOn(repository, 'findAll').mockRejectedValueOnce(new Error('kaputt'));

    await store.load();

    expect(store.storageError()).not.toBeNull();
  });
});
