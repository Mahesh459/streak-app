import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the streak dashboard', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Make today count.');
    expect(compiled.querySelector('.dashboard')).toBeTruthy();
  });

  it('should delete a streak after confirmation and select the next one', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.streaks.set([
      { id: 'one', title: 'First', emoji: '📚', color: '#ff8b5e', createdAt: '2026-09-01', completedDates: [] },
      { id: 'two', title: 'Second', emoji: '🏃', color: '#8978e8', createdAt: '2026-09-01', completedDates: [] },
    ]);
    app.selectStreak('one');
    spyOn(window, 'confirm').and.returnValue(true);

    app.removeStreak('one');

    expect(app.streaks().map((streak) => streak.id)).toEqual(['two']);
    expect(app.selectedId()).toBe('two');
  });

  it('should keep a streak when deletion is cancelled', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.streaks.set([
      { id: 'one', title: 'First', emoji: '📚', color: '#ff8b5e', createdAt: '2026-09-01', completedDates: [] },
    ]);
    spyOn(window, 'confirm').and.returnValue(false);

    app.removeStreak('one');

    expect(app.streaks().length).toBe(1);
  });
});
