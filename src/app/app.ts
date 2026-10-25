import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ProfileOverview } from './features/profile/profile-overview';

@Component({
  selector: 'app-root',
  imports: [ProfileOverview],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
