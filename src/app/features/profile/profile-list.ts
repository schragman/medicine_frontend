import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ProfileStore } from '../../core/profile.store';

/**
 * Lists every profile and switches the active one (US-02). The active entry is marked
 * by a check mark and the word "aktiv", never by colour alone (Ü-3).
 */
@Component({
  selector: 'med-profile-list',
  templateUrl: './profile-list.html',
  styleUrl: './profile-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileList {
  protected readonly store = inject(ProfileStore);

  protected readonly activeId = computed(() => this.store.activeProfile()?.id ?? null);

  protected select(id: string): void {
    this.store.activate(id);
  }
}
