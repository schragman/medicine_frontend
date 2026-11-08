import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

import { Profile } from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';
import { BodySilhouette } from '../silhouette/body-silhouette';
import { ProfileDeleteDialog } from './profile-delete-dialog';
import { ProfileFormDialog } from './profile-form-dialog';
import { ProfileList } from './profile-list';
import { ProfileRenameDialog } from './profile-rename-dialog';

/**
 * Start page: create profiles (US-01), switch between them and see the active one (US-02),
 * rename and delete them (US-03).
 */
@Component({
  selector: 'med-profile-overview',
  imports: [
    BodySilhouette,
    ProfileDeleteDialog,
    ProfileFormDialog,
    ProfileList,
    ProfileRenameDialog,
  ],
  templateUrl: './profile-overview.html',
  styleUrl: './profile-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileOverview {
  protected readonly store = inject(ProfileStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly dialogOpen = signal(false);
  protected readonly profileToRename = signal<Profile | null>(null);
  protected readonly profileToDelete = signal<Profile | null>(null);

  constructor() {
    void this.store.load();
  }

  protected openDialog(): void {
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
  }

  /**
   * The button that opened the dialog is gone with its profile, so the focus moves to the
   * profile that is active now, or to the empty state's create button (Ü-2).
   */
  protected onDeleted(): void {
    this.profileToDelete.set(null);
    afterNextRender(
      () => {
        const target =
          this.host.nativeElement.querySelector<HTMLElement>('[aria-current="true"]') ??
          this.host.nativeElement.querySelector<HTMLElement>('[data-testid="create-first-profile"]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
