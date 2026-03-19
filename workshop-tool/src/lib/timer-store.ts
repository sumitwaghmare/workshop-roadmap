// Simple in-memory timer store for workshop sessions.
// Note: This will be reset on server restart, but fits the "no-db" "local" requirement.

interface TimerState {
  sessionId: string;
  duration: number; // in seconds
  startedAt: number | null; // Date.now() timestamp
  elapsedAtPause: number; // in seconds
  status: 'stopped' | 'running' | 'paused';
}

class TimerStore {
  private static instance: TimerStore;
  private timers: Map<string, TimerState> = new Map();

  private constructor() {}

  public static getInstance(): TimerStore {
    if (!TimerStore.instance) {
      TimerStore.instance = new TimerStore();
    }
    return TimerStore.instance;
  }

  public getTimer(sessionId: string): TimerState {
    if (!this.timers.has(sessionId)) {
      this.timers.set(sessionId, {
        sessionId,
        duration: 300, // Default 5 mins
        startedAt: null,
        elapsedAtPause: 0,
        status: 'stopped',
      });
    }
    return this.timers.get(sessionId)!;
  }

  public updateTimer(sessionId: string, updates: Partial<TimerState>): TimerState {
    const current = this.getTimer(sessionId);
    const updated = { ...current, ...updates };
    this.timers.set(sessionId, updated);
    return updated;
  }
}

export const timerStore = TimerStore.getInstance();
