import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
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

import { NAME_REQUIRED_MESSAGE, Profile, ProfileNotFoundError } from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';
import {
  DUPLICATE_NAME_MESSAGE,
  flagDuplicateAtField,
  requiredName,
  uniqueName,
} from './profile-validators';

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
  private readonly injector = inject(Injector);

  /** The profile to rename; the dialog is open while it is set. */
  readonly profile = input<Profile | null>(null);

  readonly renamed = output<Profile>();
  readonly cancelled = output<void>();

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  /** True once the profile turned out to be deleted elsewhere; only closing is left. */
  protected readonly profileGone = signal(false);

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
      this.focus('#profile-rename-name');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      this.renamed.emit(await this.store.rename(profile.id, this.form.getRawValue().name));
    } catch (error) {
      if (flagDuplicateAtField(error, this.form.controls.name)) {
        // The field says so already (AC2) — no second message below the form.
        this.focus('#profile-rename-name');
        return;
      }
      if (error instanceof ProfileNotFoundError) {
        // Retrying cannot succeed: offer closing only, and move the focus there (Ü-2).
        this.profileGone.set(true);
        afterNextRender(() => this.focus('[data-testid="rename-close"]'), {
          injector: this.injector,
        });
      }
      this.submitError.set(
        error instanceof Error ? error.message : 'Die Silhouette konnte nicht umbenannt werden.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private focus(selector: string): void {
    this.dialogRef().nativeElement.querySelector<HTMLElement>(selector)?.focus();
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
    // Reset here rather than on opening: the name field has to be rendered again by
    // then, so that opening can focus it.
    this.profileGone.set(false);
    if (this.profile()) {
      this.cancelled.emit();
    }
  }
}
