import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BODY_FORM_LABELS, Profile } from '../../core/model/profile';

/**
 * Stand-in for the anatomical silhouette until US-04 renders the real SVG. It shows the
 * profile's identity so that US-01 AC5 ("the profile is active and its silhouette is
 * shown") is observable, and already draws a translucent, human-proportioned body
 * outline wide enough to host the organ, skeleton and vessel layers of US-04 / US-05.
 */
@Component({
  selector: 'med-silhouette-placeholder',
  templateUrl: './silhouette-placeholder.html',
  styleUrl: './silhouette-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SilhouettePlaceholder {
  readonly profile = input.required<Profile>();

  protected readonly bodyFormLabels = BODY_FORM_LABELS;
}
