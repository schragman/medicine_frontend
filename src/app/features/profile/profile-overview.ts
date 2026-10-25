import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ProfileStore } from '../../core/profile.store';
import { SilhouettePlaceholder } from '../silhouette/silhouette-placeholder';
import { ProfileFormDialog } from './profile-form-dialog';
import { ProfileList } from './profile-list';

/** Start page: create profiles (US-01), switch between them and see the active one (US-02). */
@Component({
  selector: 'med-profile-overview',
  imports: [ProfileFormDialog, ProfileList, SilhouettePlaceholder],
  templateUrl: './profile-overview.html',
  styleUrl: './profile-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileOverview {
  protected readonly store = inject(ProfileStore);

  protected readonly dialogOpen = signal(false);

  constructor() {
    void this.store.load();
  }

  protected openDialog(): void {
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
  }
}
