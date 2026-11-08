import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Profile } from '../../core/model/profile';
import { BodySilhouette } from './body-silhouette';

function profile(id: string, name: string): Profile {
  return { id, name, birthYear: null, bodyForm: 'NEUTRAL', createdAt: '2026-01-01T00:00:00.000Z' };
}

describe('BodySilhouette', () => {
  let fixture: ComponentFixture<BodySilhouette>;

  const shownView = () =>
    (fixture.nativeElement as HTMLElement)
      .querySelector('[data-testid="silhouette"]')
      ?.getAttribute('data-view');

  function showProfile(shown: Profile): void {
    fixture.componentRef.setInput('profile', shown);
    fixture.detectChanges();
  }

  function showBack(): void {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="view-back"]')!
      .click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(BodySilhouette);
    showProfile(profile('a', 'Anna'));
  });

  it('switches to the back view', () => {
    showBack();

    expect(shownView()).toBe('BACK');
  });

  it('starts on the front view for another profile', () => {
    showBack();

    showProfile(profile('b', 'Bea'));

    expect(shownView()).toBe('FRONT');
  });

  it('keeps the view when the same profile is renamed', () => {
    showBack();

    showProfile(profile('a', 'Anne'));

    expect(shownView()).toBe('BACK');
  });
});
