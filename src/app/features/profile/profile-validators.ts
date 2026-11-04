import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ProfileStore } from '../../core/profile.store';

/** Like Validators.required, but a name of whitespace only counts as missing too. */
export function requiredName(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim() !== '' ? null : { required: true };
}

/**
 * Rejects names that are already in use (US-01 AC4). When renaming, `exceptId()` names
 * the profile being renamed, so that it may keep its own name.
 */
export function uniqueName(
  store: ProfileStore,
  exceptId: () => string | undefined = () => undefined,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    return store.isNameTaken(value, exceptId()) ? { duplicateName: true } : null;
  };
}

export const DUPLICATE_NAME_MESSAGE = 'Es gibt bereits eine Silhouette mit diesem Namen.';
