// NOTE: This is experimental... not real tests!
import { expect, test, jest, describe, beforeEach } from "@jest/globals";
import { DotTimer } from "./utils";

describe("DotTimer", () => {
  describe("when timer is never started", () => {
    jest.useFakeTimers();
    let callback = jest.fn();
    let endCallback = jest.fn();
    let dotTimer = new DotTimer(callback, endCallback, 1000, 8000);
    jest.runAllTimers();

    test("callbacks are never called", () => {
      expect(callback).toHaveBeenCalledTimes(0);
      expect(endCallback).toHaveBeenCalledTimes(0);
    });

    test("properties are init as expected", () => {
      expect(dotTimer["delay"]).toBe(1000);
      expect(dotTimer["remaining"]).toBe(1000);
      expect(dotTimer["start"]).toBe(undefined);
      expect(dotTimer["remainingTicks"]).toBe(8);
      expect(dotTimer["intervalId"]).toBe(undefined);
      expect(dotTimer["timeoutId"]).toBe(undefined);
    });
  });

  describe("when ran without pause", () => {
    jest.useFakeTimers();
    let callback = jest.fn();
    let endCallback = jest.fn();
    const EXPECTED_CALLBACK_CALLS = 8;
    const EXPECTED_END_CALLBACK_CALLS = 1;
    let dotTimer = new DotTimer(callback, endCallback, 1000, 8000);
    dotTimer.play();
    jest.runAllTimers();

    test(`callback is called ${EXPECTED_CALLBACK_CALLS} times and endCallback called ${EXPECTED_END_CALLBACK_CALLS} times`, () => {
      expect(callback).toHaveBeenCalledTimes(EXPECTED_CALLBACK_CALLS);
      expect(endCallback).toHaveBeenCalledTimes(EXPECTED_END_CALLBACK_CALLS);
    });
  });

  describe("when paused once", () => {
    jest.useFakeTimers();

    describe("before 1st tick", () => {
      let callback: any;
      let endCallback: any;
      let dotTimer: DotTimer;

      beforeEach(() => {
        callback = jest.fn();
        endCallback = jest.fn();
        dotTimer = new DotTimer(callback, endCallback, 1000, 8000);
        dotTimer.play();
        jest.advanceTimersByTime(400);

        dotTimer.pause();
      });

      test("resuming instantly, will track remaining time correcly", () => {
        expect(dotTimer["remaining"]).toEqual(600);
        expect(callback).toHaveBeenCalledTimes(0);

        dotTimer.play();
        jest.runAllTimers();
        expect(callback).toHaveBeenCalledTimes(8);
      });

      test("waiting 200ms and resuming before 1st tick, will track remaining time correcly", () => {
        jest.advanceTimersByTime(200);

        expect(dotTimer["remaining"]).toEqual(600);
        expect(callback).toHaveBeenCalledTimes(0);

        dotTimer.play();
        jest.runAllTimers();
        expect(callback).toHaveBeenCalledTimes(8);
      });

      test("waiting 800ms and resuming before 1st tick, will track remaining time correcly", () => {
        jest.advanceTimersByTime(800);

        expect(dotTimer["remaining"]).toEqual(600);
        expect(callback).toHaveBeenCalledTimes(0);

        dotTimer.play();
        jest.runAllTimers();
        expect(callback).toHaveBeenCalledTimes(8);
      });
    });
  });

  describe("complex", () => {
    jest.useFakeTimers();

    test("all kinds of nasty pauses.", () => {
      let callback = jest.fn();
      let endCallback = jest.fn();
      let dotTimer = new DotTimer(callback, endCallback, 1000, 3000);

      dotTimer.play();
      jest.advanceTimersByTime(400);
      dotTimer.pause();
      jest.advanceTimersByTime(800);
      expect(dotTimer["remaining"]).toEqual(600);
      expect(dotTimer["remainingTicks"]).toEqual(3);
      expect(callback).toHaveBeenCalledTimes(0);

      dotTimer.play();
      jest.advanceTimersByTime(2000);
      dotTimer.pause();
      expect(dotTimer["remaining"]).toEqual(600);
      expect(dotTimer["remainingTicks"]).toEqual(1);
      expect(callback).toHaveBeenCalledTimes(2);

      dotTimer.play();
      jest.advanceTimersByTime(300);
      dotTimer.pause();
      expect(dotTimer["remaining"]).toEqual(300);
      expect(dotTimer["remainingTicks"]).toEqual(1);
      expect(callback).toHaveBeenCalledTimes(2);

      dotTimer.play();
      jest.advanceTimersByTime(300);
      dotTimer.pause();
      expect(dotTimer["remaining"]).toEqual(1000);
      expect(dotTimer["remainingTicks"]).toEqual(0);
      expect(callback).toHaveBeenCalledTimes(3);

      jest.advanceTimersByTime(300);
      dotTimer.play();
      jest.runAllTimers();
      expect(dotTimer["remainingTicks"]).toEqual(0);
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });
});
