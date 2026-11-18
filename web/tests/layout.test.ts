import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import type { ScheduleEvent } from "@/lib/types";
import {
  assignColumns,
  daySegment,
  isCasualActive,
  isMultiDay,
  layoutDay,
  singleDayEvents,
  weekSpanSegments,
} from "@/lib/layout";

function iso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return format(new Date(year, month - 1, day, hour, minute), "yyyy-MM-dd'T'HH:mm:ss");
}

function makeEvent(id: number, overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id,
    title: `Event ${id}`,
    notes: null,
    type: "NORMAL",
    priority: "MEDIUM",
    status: "PLANNED",
    startAt: iso(2026, 11, 5, 10),
    endAt: iso(2026, 11, 5, 11),
    dueAt: null,
    parentId: null,
    parentTitle: null,
    location: null,
    goalCompleted: false,
    weatherSensitive: false,
    lookaheadDays: 0,
    completedAt: null,
    createdAt: iso(2026, 11, 1),
    updatedAt: iso(2026, 11, 1),
    ...overrides,
  };
}

const now = new Date(2026, 10, 5, 10, 30);
const day = new Date(2026, 10, 5);

describe("day segments", () => {
  it("clips a multi-day event to the visible day", () => {
    const event = makeEvent(1, {
      startAt: iso(2026, 11, 4, 18),
      endAt: iso(2026, 11, 6, 12),
    });
    const segment = daySegment(event, day, now);
    expect(segment).not.toBeNull();
    expect(segment?.startMin).toBe(0);
    expect(segment?.endMin).toBe(24 * 60);
    expect(segment?.continuesBefore).toBe(true);
    expect(segment?.continuesAfter).toBe(true);
  });

  it("uses now as the end of an open goal", () => {
    const goal = makeEvent(2, {
      type: "GOAL",
      startAt: iso(2026, 11, 2, 9),
      endAt: null,
    });
    const segment = daySegment(goal, day, now);
    expect(segment?.endMin).toBeCloseTo(10 * 60 + 30, 0);
    expect(isMultiDay(goal, now)).toBe(true);
  });

  it("assigns priority lanes and sub-rows for overlapping items", () => {
    const events = [
      makeEvent(1, { priority: "HIGH", startAt: iso(2026, 11, 5, 9), endAt: iso(2026, 11, 5, 10) }),
      makeEvent(2, { priority: "HIGH", startAt: iso(2026, 11, 5, 9, 30), endAt: iso(2026, 11, 5, 10, 30) }),
      makeEvent(3, { priority: "LOW", startAt: iso(2026, 11, 5, 14), endAt: iso(2026, 11, 5, 15) }),
    ];
    const layout = layoutDay(events, day, now);
    const high = layout.lanes.find((lane) => lane.key === "HIGH");
    const low = layout.lanes.find((lane) => lane.key === "LOW");
    expect(high?.segments).toHaveLength(2);
    expect(high?.rowCount).toBe(2);
    expect(new Set(high?.segments.map((segment) => segment.row)).size).toBe(2);
    expect(low?.segments).toHaveLength(1);
  });

  it("separates container shells from the goal band", () => {
    const events = [
      makeEvent(1, { type: "CONTAINER", startAt: iso(2026, 11, 5, 20), endAt: iso(2026, 11, 5, 21) }),
      makeEvent(2, { type: "GOAL", startAt: iso(2026, 11, 2, 9), endAt: null }),
    ];
    const layout = layoutDay(events, day, now);
    expect(layout.containers).toHaveLength(1);
    expect(layout.goals).toHaveLength(1);
    expect(layout.lanes.every((lane) => lane.segments.length === 0)).toBe(true);
  });

  it("marks casual events that are currently in their window", () => {
    const casual = makeEvent(1, {
      type: "CASUAL",
      startAt: iso(2026, 11, 5, 10),
      endAt: iso(2026, 11, 5, 11),
    });
    expect(isCasualActive(casual, now)).toBe(true);
    expect(isCasualActive(casual, new Date(2026, 10, 5, 12))).toBe(false);
  });
});

describe("week spans", () => {
  const weekStart = new Date(2026, 10, 2);

  it("lays a trip across Friday to Sunday", () => {
    const trip = makeEvent(1, {
      startAt: iso(2026, 11, 6, 18),
      endAt: iso(2026, 11, 8, 20),
    });
    const spans = weekSpanSegments([trip], weekStart, now);
    expect(spans).toHaveLength(1);
    expect(spans[0].startIndex).toBe(4);
    expect(spans[0].endIndex).toBe(6);
    expect(spans[0].continuesBefore).toBe(false);
    expect(spans[0].continuesAfter).toBe(false);
  });

  it("clips a span that began before the week", () => {
    const event = makeEvent(1, {
      startAt: iso(2026, 10, 30, 18),
      endAt: iso(2026, 11, 3, 10),
    });
    const spans = weekSpanSegments([event], weekStart, now);
    expect(spans[0].startIndex).toBe(0);
    expect(spans[0].endIndex).toBe(1);
    expect(spans[0].continuesBefore).toBe(true);
  });
});

describe("month / overlap helpers", () => {
  it("assigns side-by-side columns to overlapping intervals", () => {
    const placements = assignColumns([
      { start: 0, end: 60 },
      { start: 30, end: 90 },
      { start: 120, end: 180 },
    ]);
    expect(placements[0]).toEqual({ column: 0, columnCount: 2 });
    expect(placements[1]).toEqual({ column: 1, columnCount: 2 });
    expect(placements[2]).toEqual({ column: 0, columnCount: 1 });
  });

  it("returns single-day events only", () => {
    const events = [
      makeEvent(1),
      makeEvent(2, { startAt: iso(2026, 11, 4, 18), endAt: iso(2026, 11, 6, 12) }),
    ];
    expect(singleDayEvents(events, day, now).map((event) => event.id)).toEqual([1]);
  });
});
