import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { BODY_FORM_LABELS, Profile } from '../../core/model/profile';
import {
  BODY_VIEWS,
  BODY_VIEW_LABELS,
  BodyView,
  VIEW_BOX,
  silhouetteShapes,
  viewDetails,
} from './silhouette-geometry';

/**
 * The active profile's body as a vector silhouette (US-04): front and back view, shaped
 * by the profile's body form. Organs and bones are layered into it later (US-05).
 */
@Component({
  selector: 'med-body-silhouette',
  templateUrl: './body-silhouette.html',
  styleUrl: './body-silhouette.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BodySilhouette {
  readonly profile = input.required<Profile>();

  protected readonly views = BODY_VIEWS;
  protected readonly viewLabels = BODY_VIEW_LABELS;
  protected readonly bodyFormLabels = BODY_FORM_LABELS;
  protected readonly viewBox = `0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`;

  protected readonly view = signal<BodyView>('FRONT');

  protected readonly shapes = computed(() => silhouetteShapes(this.profile().bodyForm));
  protected readonly details = computed(() => viewDetails(this.profile().bodyForm, this.view()));

  /**
   * Seen from the front, the person's right side is on the viewer's left. The markers
   * say so, because mixing up the sides would put a problem on the wrong body part.
   */
  protected readonly sideMarkers = computed(() =>
    this.view() === 'FRONT' ? { left: 'R', right: 'L' } : { left: 'L', right: 'R' },
  );

  /** Long description for assistive technology (Ü-2). */
  protected readonly description = computed(() => {
    const profile = this.profile();
    const side =
      this.view() === 'FRONT'
        ? 'Die rechte Körperseite ist links im Bild.'
        : 'Die rechte Körperseite ist rechts im Bild.';
    return `Körperumriss eines Menschen in Körperform ${BODY_FORM_LABELS[profile.bodyForm]}, stehend mit leicht abgespreizten Armen. ${side}`;
  });

  protected show(view: BodyView): void {
    this.view.set(view);
  }
}
