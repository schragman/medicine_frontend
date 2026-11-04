import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { DuplicateProfileNameError, NAME_REQUIRED_MESSAGE, Profile } from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';
import { DUPLICATE_NAME_MESSAGE, requiredName, uniqueName } from './profile-validators';

/** Dialog for renaming a profile (US-03). Open while `profile` is set. */
@Component({
  selector: 'med-profile-rename-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-rename-dialog.html',
  styleUrl: './profile-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileRenameDialog {
  private readonly store = inject(ProfileStore);
  private readonly formBuilder = inject(FormBuilder);

  /** The profile to rename; the dialog is open while it is set. */
  readonly profile = input<Profile | null>(null);

  readonly renamed = output<Profile>();
  readonly cancelled = output<void>();

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [requiredName, uniqueName(this.store, () => this.profile()?.id)]],
  });

  private readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Latest form event — read by the error message so that it recomputes. */
  private readonly formEvent = toSignal(this.form.events);

  protected readonly nameError = computed(() => {
    void this.formEvent();
    const control = this.form.controls.name;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return NAME_REQUIRED_MESSAGE;
    }
    if (control.hasError('duplicateName')) {
      return DUPLICATE_NAME_MESSAGE;
    }
    return null;
  });

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      const profile = this.profile();
      if (profile) {
        if (!dialog.open) {
          // Untracked: resetting runs the uniqueName validator, which reads the store's
          // profiles — the effect must not re-run whenever they change.
          untracked(() => {
            this.form.reset({ name: profile.name });
            this.submitError.set(null);
            this.submitting.set(false);
          });
          dialog.showModal();
          dialog.querySelector<HTMLInputElement>('#profile-rename-name')?.select();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected async submit(): Promise<void> {
    const profile = this.profile();
    if (!profile) {
      return;
    }
    this.form.controls.name.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();
      this.dialogRef().nativeElement.querySelector<HTMLElement>('#profile-rename-name')?.focus();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      this.renamed.emit(await this.store.rename(profile.id, this.form.getRawValue().name));
    } catch (error) {
      if (error instanceof DuplicateProfileNameError) {
        // The store has reloaded, as another tab took the name: flag it at the field
        // (AC2), which already says so — no second message below the form.
        this.form.controls.name.markAsTouched();
        this.form.controls.name.updateValueAndValidity();
        return;
      }
      this.submitError.set(
        error instanceof Error ? error.message : 'Die Silhouette konnte nicht umbenannt werden.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected cancel(): void {
    if (!this.submitting()) {
      this.dialogRef().nativeElement.close();
    }
  }

  /** Esc while saving would report a cancel for a rename that happens anyway. */
  protected onCancel(event: Event): void {
    if (this.submitting()) {
      event.preventDefault();
    }
  }

  /** Reports a cancel unless the parent has closed the dialog itself. */
  protected onClose(): void {
    if (this.profile()) {
      this.cancelled.emit();
    }
  }
}
