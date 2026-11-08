import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_BODY_FORM,
  DuplicateProfileNameError,
  EmptyProfileNameError,
  ProfileDraft,
  ProfileNotFoundError,
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

  describe('rename (US-03)', () => {
    it('renames a profile and stores the new name', async () => {
      const anna = await store.create(draft('Anna'));

      const renamed = await store.rename(anna.id, '  Anne ');

      expect(renamed.name).toBe('Anne');
      expect(store.activeProfile()?.name).toBe('Anne');
      expect((await repository.findAll()).map((profile) => profile.name)).toEqual(['Anne']);
    });

    it('lets a profile keep its own name in a different case', async () => {
      const anna = await store.create(draft('Anna'));

      await expect(store.rename(anna.id, 'ANNA')).resolves.toMatchObject({ name: 'ANNA' });
    });

    it('rejects a name used by another profile (AC2)', async () => {
      await store.create(draft('Anna'));
      const bea = await store.create(draft('Bea'));

      await expect(store.rename(bea.id, 'anna')).rejects.toThrow(DuplicateProfileNameError);
      expect(store.profiles().find((profile) => profile.id === bea.id)?.name).toBe('Bea');
    });

    it('rejects a blank name', async () => {
      const anna = await store.create(draft('Anna'));

      await expect(store.rename(anna.id, '  ')).rejects.toThrow(EmptyProfileNameError);
    });

    it('does not bring back a profile deleted elsewhere in the meantime', async () => {
      const anna = await store.create(draft('Anna'));
      const bea = await store.create(draft('Bea'));
      store.activate(anna.id);
      // Deleted by another tab after this one had loaded.
      await repository.delete(anna.id);

      await expect(store.rename(anna.id, 'Anne')).rejects.toThrow(ProfileNotFoundError);

      expect(await repository.findAll()).toEqual([bea]);
      expect(store.profiles()).toEqual([bea]);
      expect(store.activeProfile()).toEqual(bea);
    });

    it('reports an unknown profile as not found, not as a storage failure', async () => {
      await expect(store.rename('does-not-exist', 'Anne')).rejects.toThrow(ProfileNotFoundError);
    });

    it('reports a profile deleted elsewhere even if the name is unchanged', async () => {
      const anna = await store.create(draft('Anna'));
      await repository.delete(anna.id);

      await expect(store.rename(anna.id, 'Anna')).rejects.toThrow(ProfileNotFoundError);
      expect(store.hasProfiles()).toBe(false);
    });

    it('reports a storage failure to the caller', async () => {
      const anna = await store.create(draft('Anna'));
      vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error('Speicher voll'));

      await expect(store.rename(anna.id, 'Anne')).rejects.toThrow(StorageUnavailableError);
      expect(store.activeProfile()?.name).toBe('Anna');
    });
  });

  describe('remove (US-03)', () => {
    it('deletes the profile from the store and the repository', async () => {
      const anna = await store.create(draft('Anna'));
      await store.create(draft('Bea'));

      await store.remove(anna.id);

      expect(store.profiles().map((profile) => profile.name)).toEqual(['Bea']);
      expect((await repository.findAll()).map((profile) => profile.name)).toEqual(['Bea']);
    });

    it('keeps the active profile when another one is deleted', async () => {
      const anna = await store.create(draft('Anna'));
      const bea = await store.create(draft('Bea'));
      store.activate(anna.id);

      await store.remove(bea.id);

      expect(store.activeProfile()).toEqual(anna);
    });

    it('activates the newest remaining profile after deleting the active one (AC4)', async () => {
      for (const [id, name, month] of [
        ['1', 'Anna', '01'],
        ['2', 'Bea', '02'],
        ['3', 'Cleo', '03'],
      ]) {
        await repository.save({
          id,
          name,
          birthYear: null,
          bodyForm: 'NEUTRAL',
          createdAt: `2026-${month}-01T00:00:00.000Z`,
        });
      }
      await store.load();
      store.activate('2');

      await store.remove('2');

      expect(store.activeProfile()?.name).toBe('Cleo');
    });

    it('has no active profile after deleting the last one (AC4)', async () => {
      const anna = await store.create(draft('Anna'));

      await store.remove(anna.id);

      expect(store.activeProfile()).toBeNull();
      expect(store.hasProfiles()).toBe(false);
    });

    it('keeps the profile when deleting fails', async () => {
      const anna = await store.create(draft('Anna'));
      vi.spyOn(repository, 'delete').mockRejectedValueOnce(new Error('kaputt'));

      await expect(store.remove(anna.id)).rejects.toThrow(StorageUnavailableError);
      expect(store.activeProfile()).toEqual(anna);
    });
  });

  it('surfaces a failure to load instead of failing silently', async () => {
    vi.spyOn(repository, 'findAll').mockRejectedValueOnce(new Error('kaputt'));

    await store.load();

    expect(store.storageError()).not.toBeNull();
  });
});
