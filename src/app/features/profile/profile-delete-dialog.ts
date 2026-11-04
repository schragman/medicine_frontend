import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { Profile } from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';

/**
 * Asks for an explicit confirmation before a profile is deleted and points out that its
 * health issues go with it (US-03 AC3, rule R7). Open while `profile` is set.
 */
@Component({
  selector: 'med-profile-delete-dialog',
  templateUrl: './profile-delete-dialog.html',
  styleUrl: './profile-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDeleteDialog {
  private readonly store = inject(ProfileStore);

  /** The profile to delete; the dialog is open while it is set. */
  readonly profile = input<Profile | null>(null);

  readonly deleted = output<Profile>();
  readonly cancelled = output<void>();

  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  private readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.profile()) {
        if (!dialog.open) {
          this.deleteError.set(null);
          this.deleting.set(false);
          dialog.showModal();
          // The safe choice gets the focus, so that Enter does not delete by accident.
          dialog.querySelector<HTMLElement>('[data-testid="delete-cancel"]')?.focus();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected async confirm(): Promise<void> {
    const profile = this.profile();
    if (!profile) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.store.remove(profile.id);
      this.deleted.emit(profile);
    } catch (error) {
      this.deleteError.set(
        error instanceof Error ? error.message : 'Die Silhouette konnte nicht gelöscht werden.',
      );
    } finally {
      this.deleting.set(false);
    }
  }

  protected cancel(): void {
    if (!this.deleting()) {
      this.dialogRef().nativeElement.close();
    }
  }

  /** Esc while deleting would report a cancel for a deletion that happens anyway. */
  protected onCancel(event: Event): void {
    if (this.deleting()) {
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
