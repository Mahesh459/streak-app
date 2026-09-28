import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Streak {
  id: string;
  title: string;
  emoji: string;
  color: string;
  createdAt: string;
  completedDates: string[];
}

interface CalendarDay {
  key: string;
  date: number;
  inMonth: boolean;
  isToday: boolean;
  completed: boolean;
  future: boolean;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly storageKey = 'streak-app-data-v1';
  private readonly today = new Date();
  private readonly todayKey = this.toDateKey(this.today);
  private readonly palette = ['#ff8b5e', '#8978e8', '#55a98c', '#e4a846', '#e276a7'];

  readonly streaks = signal<Streak[]>([]);
  readonly selectedId = signal('');
  readonly month = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  readonly showAddDialog = signal(false);
  readonly importMessage = signal('');
  readonly selectedStreak = computed(() =>
    this.streaks().find((streak) => streak.id === this.selectedId()) ?? this.streaks()[0] ?? null,
  );
  readonly calendarDays = computed(() => this.createCalendarDays());
  readonly currentStreak = computed(() => {
    const habit = this.selectedStreak();
    return habit ? this.getCurrentStreak(habit.completedDates) : 0;
  });
  readonly bestStreak = computed(() => {
    const habit = this.selectedStreak();
    return habit ? this.getBestStreak(habit.completedDates) : 0;
  });
  readonly monthProgress = computed(() => {
    const habit = this.selectedStreak();
    if (!habit) return 0;
    const currentMonth = this.month();
    return habit.completedDates.filter((key) => {
      const date = new Date(`${key}T00:00:00`);
      return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth();
    }).length;
  });
  readonly completedToday = computed(() =>
    this.selectedStreak()?.completedDates.includes(this.todayKey) ?? false,
  );

  readonly weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  readonly emojiOptions = ['📚', '🏃', '🧘', '💧', '✍️', '🎨', '🌱', '✨'];
  readonly todayLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(this.today);

  draftTitle = '';
  draftEmoji = this.emojiOptions[0];
  formError = '';

  ngOnInit(): void {
    void this.loadStreaks();
  }

  get monthTitle(): string {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(this.month());
  }

  get completionRate(): number {
    const habit = this.selectedStreak();
    if (!habit) return 0;
    const date = this.month();
    const elapsedDays = date.getFullYear() === this.today.getFullYear() && date.getMonth() === this.today.getMonth()
      ? this.today.getDate()
      : date.getTime() < new Date(this.today.getFullYear(), this.today.getMonth(), 1).getTime()
        ? new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        : 0;
    return elapsedDays ? Math.round((this.monthProgress() / elapsedDays) * 100) : 0;
  }

  selectStreak(id: string): void {
    this.selectedId.set(id);
  }

  changeMonth(amount: number): void {
    const date = this.month();
    this.month.set(new Date(date.getFullYear(), date.getMonth() + amount, 1));
  }

  toggleCompletion(dateKey = this.todayKey): void {
    const habit = this.selectedStreak();
    if (!habit || dateKey > this.todayKey) return;
    const completedDates = habit.completedDates.includes(dateKey)
      ? habit.completedDates.filter((date) => date !== dateKey)
      : [...habit.completedDates, dateKey].sort();
    this.updateStreak(habit.id, { completedDates });
  }

  openAddDialog(): void {
    this.draftTitle = '';
    this.draftEmoji = this.emojiOptions[0];
    this.formError = '';
    this.showAddDialog.set(true);
  }

  addStreak(): void {
    const title = this.draftTitle.trim();
    if (!title) {
      this.formError = 'Give your streak a name to get started.';
      return;
    }
    const streak: Streak = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
      title,
      emoji: this.draftEmoji,
      color: this.palette[this.streaks().length % this.palette.length],
      createdAt: this.todayKey,
      completedDates: [],
    };
    this.streaks.update((streaks) => [...streaks, streak]);
    this.selectedId.set(streak.id);
    this.showAddDialog.set(false);
    this.saveStreaks();
  }

  removeSelectedStreak(): void {
    const habit = this.selectedStreak();
    if (habit) this.removeStreak(habit.id);
  }

  removeStreak(id: string): void {
    const habit = this.streaks().find((streak) => streak.id === id);
    if (!habit || !window.confirm(`Delete “${habit.title}” and its history? This cannot be undone.`)) return;
    const remaining = this.streaks().filter((streak) => streak.id !== id);
    this.streaks.set(remaining);
    if (this.selectedId() === id) this.selectedId.set(remaining[0]?.id ?? '');
    this.saveStreaks();
  }

  exportJson(): void {
    const blob = new Blob([JSON.stringify({ streaks: this.streaks() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'my-streaks.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const candidate = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && 'streaks' in parsed
          ? (parsed as { streaks: unknown }).streaks
          : null;
      if (!Array.isArray(candidate) || !candidate.every((item) => this.isStreak(item))) {
        throw new Error('The file does not contain valid streak data.');
      }
      this.streaks.set(candidate);
      this.selectedId.set(candidate[0]?.id ?? '');
      this.saveStreaks();
      this.importMessage.set(`Imported ${candidate.length} ${candidate.length === 1 ? 'streak' : 'streaks'}.`);
    } catch (error) {
      this.importMessage.set(error instanceof Error ? error.message : 'Could not read that JSON file.');
    } finally {
      input.value = '';
    }
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private async loadStreaks(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => this.isStreak(item))) {
          this.streaks.set(parsed);
          this.selectedId.set(parsed[0]?.id ?? '');
          return;
        }
      }
    } catch {
      localStorage.removeItem(this.storageKey);
    }

    try {
      const response = await fetch('streaks.json');
      const seed: unknown = await response.json();
      if (Array.isArray(seed) && seed.every((item) => this.isStreak(item))) {
        this.streaks.set(seed);
        this.selectedId.set(seed[0]?.id ?? '');
        this.saveStreaks();
      }
    } catch {
      this.streaks.set([]);
    }
  }

  private updateStreak(id: string, changes: Partial<Streak>): void {
    this.streaks.update((streaks) => streaks.map((streak) =>
      streak.id === id ? { ...streak, ...changes } : streak,
    ));
    this.saveStreaks();
  }

  private saveStreaks(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.streaks()));
      this.importMessage.set('');
    } catch {
      this.importMessage.set('Could not save locally. Your browser storage may be full.');
    }
  }

  private createCalendarDays(): CalendarDay[] {
    const month = this.month();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const selected = this.selectedStreak();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
      const key = this.toDateKey(date);
      return {
        key,
        date: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        isToday: key === this.todayKey,
        completed: selected?.completedDates.includes(key) ?? false,
        future: key > this.todayKey,
      };
    });
  }

  getCurrentStreak(completedDates: string[]): number {
    const dates = new Set(completedDates);
    let cursor = new Date(this.today);
    if (!dates.has(this.toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(this.toDateKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  private getBestStreak(completedDates: string[]): number {
    const dates = [...new Set(completedDates)].sort();
    let best = 0;
    let run = 0;
    let previous: Date | null = null;
    for (const key of dates) {
      const date = new Date(`${key}T00:00:00`);
      const consecutive = previous !== null
        && Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
          - Date.UTC(previous.getFullYear(), previous.getMonth(), previous.getDate()) === 86_400_000;
      run = consecutive ? run + 1 : 1;
      best = Math.max(best, run);
      previous = date;
    }
    return best;
  }

  private isStreak(value: unknown): value is Streak {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<Streak>;
    return typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.emoji === 'string'
      && typeof item.color === 'string'
      && typeof item.createdAt === 'string'
      && Array.isArray(item.completedDates)
      && item.completedDates.every((date) => typeof date === 'string');
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
