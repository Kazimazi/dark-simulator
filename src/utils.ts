enum State {
  Initial,
  Running,
  Paused,
  Done,
}

/**
 * Custom pauseable and resumable interval.
 */
export class Interval {
  /**
   * Callback that happens every tick.
   */
  private callback: Function;
  /**
   * Delay between ticks.
   */
  private readonly delay: number;
  /**
   * Remaining time for the next tick to happen.
   */
  private remaining: number;
  /**
   * Track start date.
   */
  private start?: number | null;
  /**
   * Id to track the currently active interval.
   */
  private intervalId?: number | null;
  /**
   * Id to track the currently active timeout.
   */
  private timeoutId?: number | null;
  /**
   * State of the timer.
   */
  private state: State = State.Initial;

  constructor(callback: Function, delay: number) {
    this.callback = callback;
    this.delay = delay;
    this.remaining = delay;
  }

  private startInterval() {
    this.intervalId = setInterval(() => {
      this.callback();
      this.remaining = this.delay;
    }, this.delay);
  }

  play() {
    if (this.state == State.Running || this.state == State.Done) return;
    this.start = Date.now();
    if (this.state == State.Initial) {
      this.state = State.Running;
      this.start = Date.now();
      this.startInterval();
    } else {
      this.state = State.Running;
      this.timeoutId = setTimeout(() => {
        this.intervalId = null;
        this.callback();
        this.start = Date.now();
        this.startInterval();
      }, this.remaining);
    }
  }

  pause() {
    if (this.state != State.Running) return;
    if (!this.start)
      throw Error("Start time of interval should have been defined.");
    this.state = State.Paused;
    this.remaining = this.delay - ((Date.now() - this.start) % this.delay);
    this.start = null;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  stop() {
    if (this.state == State.Done) return;
    this.state = State.Done;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Custom pauseable and resumable timer with interval, designed to use for DoTs.
 *
 * What does it do.
 */
export class DotTimer {
  /**
   * Callback that happens every tick.
   */
  private callback: Function;
  /**
   * Callback that happens at the end of life-time of `DotTimer`.
   */
  private endCallback: Function;
  /**
   * Delay between ticks.
   */
  private readonly delay: number;
  /**
   * Remaining time for the next tick to happen.
   */
  private remaining: number;
  /**
   * Remaining time after the last tick. When `DotTimer.duration` is divisible by `DotTimer.dealy`, this will be 0.
   */
  private readonly lastRemaining: number;
  /**
   * Track time of last resume.
   */
  private start?: number | null;
  /**
   * Remaining ticks.
   */
  private remainingTicks: number;
  /**
   * Id to track the currently active interval.
   */
  private intervalId?: number | null;
  /**
   * Id to track the currently active timeout time.
   */
  private timeoutId?: number | null;
  /**
   * State of the timer.
   */
  private state: State = State.Initial;

  constructor(
    callback: Function,
    endCallback: Function,
    delay: number,
    duration: number,
  ) {
    this.callback = callback;
    this.endCallback = endCallback;
    this.delay = delay;
    this.remaining = delay;
    this.remainingTicks = Math.floor(duration / delay);
    this.lastRemaining = duration % delay;
  }

  private tick() {
    this.callback();
    this.remainingTicks -= 1;
    this.start = Date.now();
    this.remaining = this.remainingTicks > 0 ? this.delay : this.lastRemaining;
  }

  private startLastTimeout() {
    this.cleanTimers();
    this.timeoutId = setTimeout(() => {
      this.stop();
    }, this.remaining);
  }

  private startInterval() {
    this.intervalId = setInterval(() => {
      if (this.remainingTicks > 0) {
        this.tick();
      }
      if (this.remainingTicks <= 0) {
        // No more ticks remaining, finish last timeout.
        this.startLastTimeout();
      }
    }, this.delay);
  }

  play() {
    if (this.state == State.Running || this.state == State.Done) return;
    const state = this.state;
    this.state = State.Running;
    this.start = Date.now();
    if (state == State.Initial) {
      this.startInterval();
    } else if (this.remainingTicks <= 0) {
      this.startLastTimeout();
    } else {
      // Case of when timer was paused before, but this is not last timeout.
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        this.tick();
        if (this.remainingTicks > 0) {
          this.startInterval();
        } else {
          this.startLastTimeout();
        }
      }, this.remaining);
    }
  }

  // Stops all tracked timers.
  private cleanTimers() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearInterval(this.timeoutId);
      this.timeoutId = null;
    }
  }

  pause() {
    if (this.state != State.Running) return;
    if (!this.start)
      throw Error("Start time of interval should have been defined.");
    this.state = State.Paused;
    this.cleanTimers();
    {
      const diff = Date.now() - this.start;
      console.log(
        `PAUSE: new_rem(${this.remaining - diff}) = rem(${this.remaining}) - diff(${diff})`,
      );
      this.remaining -= diff;
    }
  }

  stop() {
    if (this.state == State.Done) return;
    this.state = State.Done;
    this.cleanTimers();
    this.endCallback();
  }
}
