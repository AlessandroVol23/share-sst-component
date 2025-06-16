export type Size = `${number} ${"MB" | "GB"}`;
export type SizeGbTb = `${number} ${"GB" | "TB"}`;
export declare function toMBs(size: Size | SizeGbTb): number;
export declare function toGBs(size: Size | SizeGbTb): number;
