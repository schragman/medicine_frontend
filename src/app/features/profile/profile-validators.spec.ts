import { FormControl } from '@angular/forms';

import { DuplicateProfileNameError } from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';
import { flagDuplicateAtField, uniqueName } from './profile-validators';

/** Stand-in for the store: only the duplicate check is needed. */
function storeKnowing(...names: string[]): ProfileStore {
  return {
    isNameTaken: (name: string) => names.includes(name.trim()),
  } as Partial<ProfileStore> as ProfileStore;
}

describe('flagDuplicateAtField', () => {
  it('flags the field once the reloaded store knows the name', () => {
    const control = new FormControl('Cleo', [uniqueName(storeKnowing('Cleo'))]);

    expect(flagDuplicateAtField(new DuplicateProfileNameError('Cleo'), control)).toBe(true);
    expect(control.touched).toBe(true);
    expect(control.hasError('duplicateName')).toBe(true);
  });

  it('leaves the message to the caller if the reload did not pick up the name', () => {
    // The reload failed, so the store still does not know "Cleo".
    const control = new FormControl('Cleo', [uniqueName(storeKnowing())]);

    expect(flagDuplicateAtField(new DuplicateProfileNameError('Cleo'), control)).toBe(false);
  });

  it('ignores other errors', () => {
    const control = new FormControl('Cleo', [uniqueName(storeKnowing('Cleo'))]);

    expect(flagDuplicateAtField(new Error('Speicher voll'), control)).toBe(false);
    expect(control.touched).toBe(false);
  });
});
