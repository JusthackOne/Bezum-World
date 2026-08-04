import { describe, expect, it } from "bun:test";

import { formatMinutesDuration } from "./date-time";

describe("formatMinutesDuration", () => {
  it("formats minutes shorter than an hour", () => {
    expect(formatMinutesDuration(45)).toBe("45 min");
  });

  it("formats whole and partial hours", () => {
    expect(formatMinutesDuration(60)).toBe("1 hour");
    expect(formatMinutesDuration(180)).toBe("3 hours");
    expect(formatMinutesDuration(90)).toBe("1 h 30 min");
  });
});
