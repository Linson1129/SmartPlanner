import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatDuration,
  getMonthWeeks,
  getViewRange,
  greeting,
  weekdayLabel,
} from "@/lib/dates";

describe("date helpers", () => {
  it("formats durations for the UI", () => {
    expect(formatDuration(45)).toBe("45 分钟");
    expect(formatDuration(60)).toBe("1 小时");
    expect(formatDuration(95)).toBe("1 小时 35 分");
  });

  it("formats a countdown", () => {
    expect(formatCountdown(25)).toBe("25 分钟");
    expect(formatCountdown(125)).toBe("2 小时 5 分");
    expect(formatCountdown(-1)).toBe("已超时");
  });

  it("builds a six-week grid for November 2026", () => {
    const weeks = getMonthWeeks(new Date(2026, 10, 5));
    expect(weeks).toHaveLength(6);
    expect(weeks[0][0].getDate()).toBe(26);
    expect(weeks[0][0].getMonth()).toBe(9);
    expect(weeks[5][6].getMonth()).toBe(11);
  });

  it("returns inclusive-exclusive ranges", () => {
    const dayRange = getViewRange(new Date(2026, 10, 5, 15), "day");
    expect(dayRange.from.getHours()).toBe(0);
    expect(dayRange.to.getDate()).toBe(6);
    const weekRange = getViewRange(new Date(2026, 10, 5), "week");
    expect(weekdayLabel(weekRange.from)).toBe("周一");
    expect((weekRange.to.getTime() - weekRange.from.getTime()) / 86400000).toBe(7);
  });

  it("greets according to the hour", () => {
    expect(greeting(new Date(2026, 10, 5, 8))).toBe("早上好");
    expect(greeting(new Date(2026, 10, 5, 20))).toBe("晚上好");
  });
});
