import { HOURS_PER_RUN, RUN_TIME_DISPLAY, RUN_TIME_MINUTES } from "./constants";

export interface RunConversion {
  runUnits: number;
  /** Display value entered in the Run Time field. */
  runTime: string;
  /** Minutes sent to the Acumatica contract API. 8:00 = 480. */
  runTimeMinutes: number;
}

/**
 * Acumatica caps run time at 23:59, so a long estimate cannot be entered as one run time.
 * QTE's rule: Run Units = estimated hours / 8, and Run Time is always 8:00.
 * Total hours = run units × 8.
 */
export function estimatedHoursToRun(hours: number): RunConversion {
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
    throw new Error("Estimated hours must be a number greater than zero.");
  }
  const runUnits = Math.round((hours / HOURS_PER_RUN) * 10000) / 10000;
  return {
    runUnits,
    runTime: RUN_TIME_DISPLAY,
    runTimeMinutes: RUN_TIME_MINUTES,
  };
}
