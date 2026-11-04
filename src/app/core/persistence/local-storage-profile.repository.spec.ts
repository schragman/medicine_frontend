import { DuplicateProfileNameError, Profile, ProfileNotFoundError } from '../model/profile';
import { LocalStorageProfileRepository } from './local-storage-profile.repository';

const STORAGE_KEY = 'medicin.profiles';

function profile(id: string, name: string): Profile {
  return { id, name, birthYear: null, bodyForm: 'FEMALE', createdAt: '2026-01-01T00:00:00.000Z' };
}

/** Map-backed stand-in: Node's own localStorage shadows the test DOM's and is unavailable. */
function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'clear'> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    clear: () => items.clear(),
  };
}

describe('LocalStorageProfileRepository', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('gives profiles stored without a body form the default one', async () => {
    const { bodyForm: _omitted, ...withoutBodyForm } = profile('1', 'Anna');
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, profiles: [withoutBodyForm] }),
    );

    const [loaded] = await new LocalStorageProfileRepository().findAll();

    expect(loaded.bodyForm).toBe('NEUTRAL');
  });

  it('rejects a name that another tab has stored in the meantime (AC4)', async () => {
    const tabA = new LocalStorageProfileRepository();
    const tabB = new LocalStorageProfileRepository();

    await tabA.save(profile('1', 'Anna'));

    await expect(tabB.save(profile('2', 'anna'))).rejects.toThrow(DuplicateProfileNameError);
    expect(await tabA.findAll()).toHaveLength(1);
  });

  it('replaces a profile saved again under its own name', async () => {
    const repository = new LocalStorageProfileRepository();
    await repository.save(profile('1', 'Anna'));

    await repository.save({ ...profile('1', 'Anna'), birthYear: 1990 });

    expect((await repository.findAll()).map((stored) => stored.birthYear)).toEqual([1990]);
  });

  it('does not insert a profile on update that another tab has deleted (US-03)', async () => {
    const tabA = new LocalStorageProfileRepository();
    const tabB = new LocalStorageProfileRepository();
    await tabA.save(profile('1', 'Anna'));

    await tabB.delete('1');

    await expect(tabA.update(profile('1', 'Anne'))).rejects.toThrow(ProfileNotFoundError);
    expect(await tabA.findAll()).toEqual([]);
  });

  it('rejects a name on update that another profile uses (US-03 AC2)', async () => {
    const repository = new LocalStorageProfileRepository();
    await repository.save(profile('1', 'Anna'));
    await repository.save(profile('2', 'Bea'));

    await expect(repository.update(profile('2', 'ANNA'))).rejects.toThrow(DuplicateProfileNameError);
  });
});
