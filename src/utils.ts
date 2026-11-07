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
   * TODO: Use enums.
   */
  private state: "initial" | "paused" | "running" | "done" = "initial";

  constructor(callback: Function, delay: number) {
    this.callback = callback;
    this.delay = delay;
    this.remaining = delay;
  }

  private startInterval() {
    this.intervalId = window.setInterval(() => {
      this.callback();
      this.remaining = this.delay;
    }, this.delay);
  }

  play() {
    if (this.state == "running" || this.state == "done") return;
    this.start = Date.now();
    if (this.state == "initial") {
      this.state = "running";
      this.start = Date.now();
      this.startInterval();
    } else {
      this.state = "running";
      this.timeoutId = window.setTimeout(() => {
        this.intervalId = null;
        this.callback();
        this.start = Date.now();
        this.startInterval();
      }, this.remaining);
    }
  }

  pause() {
    if (this.state != "running") return;
    if (!this.start)
      throw Error("Start time of interval should have been defined.");
    this.state = "paused";
    this.remaining = this.delay - ((Date.now() - this.start) % this.delay);
    this.start = null;
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  stop() {
    if (this.state == "done") return;
    this.state = "done";
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
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
   * Last timeout that happens after last tick.
   *
   * Example #1: if DoT is 4s long, it ticks 4 times and the last timeout delay is 0.
   * Example #2: if DoT is 4.5s long, it ticks 4 times and the last timeout delay is 500ms.
   */
  private readonly lastTimeout: number;
  /**
   * Track start date.
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
   * TODO: Use enums.
   */
  private state: "initial" | "paused" | "running" | "done" = "initial";

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
    this.lastTimeout = duration % delay;
    this.remainingTicks = Math.floor(duration / delay);
  }

  private startInterval() {
    this.intervalId = window.setInterval(() => {
      this.remainingTicks -= 1;
      this.callback();
      this.remaining = this.delay;
      if (this.remainingTicks <= 0) {
        this.timeoutId = window.setTimeout(() => {
          if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
          }
          this.stop();
        }, this.lastTimeout);
      }
    }, this.delay);
  }

  play() {
    if (this.state == "running" || this.state == "done") return;
    this.start = Date.now();

    if (this.state == "initial") {
      this.startInterval();
    } else {
      this.timeoutId = window.setTimeout(() => {
        this.intervalId = null;
        this.callback();
        this.startInterval();
      }, this.remaining);
    }
  }

  pause() {
    if (this.state != "running") return;
    if (!this.start)
      throw Error("Start time of interval should have been defined.");
    this.state = "paused";
    this.remaining = this.delay - (Date.now() - this.start);
    this.start = null;
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  stop() {
    if (this.state == "done") return;
    this.state = "done";
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.endCallback();
  }
}
