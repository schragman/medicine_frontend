import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

import { Profile } from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';

/**
 * Lists every profile and switches the active one (US-02). The active entry is marked
 * by a check mark and the word "aktiv", never by colour alone (Ü-3). Each entry also
 * offers renaming and deleting (US-03); the parent opens the matching dialog.
 */
@Component({
  selector: 'med-profile-list',
  templateUrl: './profile-list.html',
  styleUrl: './profile-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileList {
  protected readonly store = inject(ProfileStore);

  readonly renameRequested = output<Profile>();
  readonly deleteRequested = output<Profile>();

  protected select(id: string): void {
    this.store.activate(id);
  }
}
