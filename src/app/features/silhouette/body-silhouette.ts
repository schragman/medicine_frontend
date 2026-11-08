import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

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

  /**
   * Starts on the front for every profile switched to. Keeping the back view would show
   * the next person with swapped side markers, which is easy to miss and would put a
   * problem on the wrong side. Renaming the same profile keeps the view.
   */
  protected readonly view = linkedSignal<string, BodyView>({
    source: () => this.profile().id,
    // The source re-runs on every change of the profile, renaming included.
    computation: (id, previous) => (previous?.source === id ? previous.value : 'FRONT'),
  });

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
    const form = this.bodyFormLabels[this.profile().bodyForm];
    // Derived from the markers, so that the text never contradicts what is shown.
    const rightSide = this.sideMarkers().left === 'R' ? 'links' : 'rechts';
    return `Körperumriss eines Menschen in Körperform ${form}, stehend mit leicht abgespreizten Armen. Die rechte Körperseite ist ${rightSide} im Bild.`;
  });

  protected show(view: BodyView): void {
    this.view.set(view);
  }
}
