import { describe, expect, it } from "vitest";
import { RUN_TIME_DISPLAY, RUN_TIME_MINUTES } from "./constants";
import { estimatedHoursToRun } from "./run-time";

describe("estimatedHoursToRun", () => {
  it("divides estimated hours by 8 and always sets run time to 8:00", () => {
    expect(estimatedHoursToRun(8)).toEqual({
      runUnits: 1,
      runTime: RUN_TIME_DISPLAY,
      runTimeMinutes: RUN_TIME_MINUTES,
    });
    expect(estimatedHoursToRun(16)).toMatchObject({ runUnits: 2, runTime: "8:00", runTimeMinutes: 480 });
    expect(estimatedHoursToRun(12)).toMatchObject({ runUnits: 1.5, runTime: "8:00" });
    expect(estimatedHoursToRun(4)).toMatchObject({ runUnits: 0.5, runTime: "8:00" });
    expect(estimatedHoursToRun(10)).toMatchObject({ runUnits: 1.25, runTime: "8:00" });
    expect(estimatedHoursToRun(1)).toMatchObject({ runUnits: 0.125, runTime: "8:00" });
    expect(estimatedHoursToRun(0.1)).toMatchObject({ runUnits: 0.0125, runTime: "8:00" });
  });

  it("keeps run time at 8:00 even when the estimate is longer than 23:59", () => {
    const run = estimatedHoursToRun(40);
    expect(run.runTime).toBe("8:00");
    expect(run.runTimeMinutes).toBe(480);
    expect(run.runUnits).toBe(5);
    expect(run.runTimeMinutes).toBeLessThanOrEqual(23 * 60 + 59);
  });

  it("rejects zero, negative, and non-numeric hours", () => {
    expect(() => estimatedHoursToRun(0)).toThrow(/greater than zero/);
    expect(() => estimatedHoursToRun(-4)).toThrow(/greater than zero/);
    expect(() => estimatedHoursToRun(Number.NaN)).toThrow(/greater than zero/);
    expect(() => estimatedHoursToRun(Number.POSITIVE_INFINITY)).toThrow(/greater than zero/);
  });
});
