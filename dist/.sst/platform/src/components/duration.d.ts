export type Duration = `${number} ${"second" | "seconds" | "minute" | "minutes" | "hour" | "hours" | "day" | "days"}`;
export type DurationSeconds = `${number} ${"second" | "seconds"}`;
export type DurationMinutes = `${number} ${"second" | "seconds" | "minute" | "minutes"}`;
export type DurationHours = `${number} ${"second" | "seconds" | "minute" | "minutes" | "hour" | "hours"}`;
export declare function toSeconds(duration: Duration | DurationMinutes | DurationSeconds): number;
