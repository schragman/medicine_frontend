import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { InMemoryProfileRepository } from './core/persistence/in-memory-profile.repository';
import { ProfileRepository } from './core/persistence/profile.repository';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: ProfileRepository, useClass: InMemoryProfileRepository }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the empty state and the add button when no profile exists', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="add-profile"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="empty-state"]')).toBeTruthy();
  });

  it('should always show the medical disclaimer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('ersetzt keine ärztliche Beratung');
  });
});
