import { differenceInCalendarDays, isSameDay } from "date-fns";
import type { EventType, Priority, ScheduleEvent } from "./types";
import { minutesOfDay, parseDateTime, startOfDay, addDays } from "./dates";

export interface DaySegment {
  event: ScheduleEvent;
  startMin: number;
  endMin: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  row: number;
}

export interface DayLane {
  key: Priority;
  label: string;
  segments: DaySegment[];
  rowCount: number;
}

export interface DayLayout {
  containers: DaySegment[];
  goals: DaySegment[];
  lanes: DayLane[];
  totalEvents: number;
}

export interface MonthSpan {
  event: ScheduleEvent;
  startIndex: number;
  endIndex: number;
  row: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export function effectiveEnd(event: ScheduleEvent, now: Date): Date | null {
  const end = parseDateTime(event.endAt);
  if (end) return end;
  if (event.type === "GOAL" && !event.goalCompleted) return now;
  return null;
}

export function isOpenGoal(event: ScheduleEvent): boolean {
  return event.type === "GOAL" && !event.goalCompleted && !event.endAt;
}

export function isContainerLike(event: ScheduleEvent): boolean {
  return event.type === "CONTAINER" || isOpenGoal(event);
}

export function isCancelled(event: ScheduleEvent): boolean {
  return event.status === "CANCELLED";
}

export function isDone(event: ScheduleEvent): boolean {
  return event.status === "DONE";
}

export function eventIntersectsRange(event: ScheduleEvent, from: Date, to: Date, now: Date): boolean {
  const start = parseDateTime(event.startAt);
  if (!start) return false;
  const end = effectiveEnd(event, now);
  if (!end) return start < to;
  return start < to && end > from;
}

export function daySegment(event: ScheduleEvent, date: Date, now: Date): DaySegment | null {
  if (isCancelled(event)) return null;
  const start = parseDateTime(event.startAt);
  const end = effectiveEnd(event, now);
  if (!start) return null;
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const endAt = end ?? start;
  if (start >= dayEnd || endAt <= dayStart) return null;
  const clippedStart = start < dayStart ? dayStart : start;
  const clippedEnd = endAt > dayEnd ? dayEnd : endAt;
  if (clippedEnd <= clippedStart) return null;
  const endMin = clippedEnd.getTime() === dayEnd.getTime() ? 24 * 60 : minutesOfDay(clippedEnd);
  return {
    event,
    startMin: minutesOfDay(clippedStart),
    endMin,
    continuesBefore: start < dayStart,
    continuesAfter: endAt > dayEnd,
    row: 0,
  };
}

function assignRows(segments: DaySegment[]): number {
  const rowEnds: number[] = [];
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  for (const segment of sorted) {
    let row = rowEnds.findIndex((end) => segment.startMin >= end - 0.01);
    if (row === -1) {
      row = rowEnds.length;
    }
    segment.row = row;
    rowEnds[row] = segment.endMin;
  }
  return Math.max(1, rowEnds.length);
}

export function layoutDay(events: ScheduleEvent[], date: Date, now: Date): DayLayout {
  const containers: DaySegment[] = [];
  const goals: DaySegment[] = [];
  const prioritySegments: Record<Priority, DaySegment[]> = {
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };

  for (const event of events) {
    const segment = daySegment(event, date, now);
    if (!segment) continue;
    if (event.type === "CONTAINER") {
      containers.push(segment);
    } else if (isOpenGoal(event)) {
      goals.push(segment);
    } else {
      prioritySegments[event.priority].push(segment);
    }
  }

  // Containers are rendered as large background shells spanning every lane;
  // open goals keep a dedicated band above the lanes. They do not share rows.
  containers.forEach((container) => {
    container.row = 0;
  });
  if (goals.length) {
    assignRows(goals);
  }

  const lanes: DayLane[] = (["HIGH", "MEDIUM", "LOW"] as Priority[]).map((priority) => {
    const segments = prioritySegments[priority];
    const rowCount = segments.length ? assignRows(segments) : 1;
    return {
      key: priority,
      label: priority,
      segments,
      rowCount,
    };
  });

  return {
    containers,
    goals,
    lanes,
    totalEvents: containers.length + goals.length + lanes.reduce((sum, lane) => sum + lane.segments.length, 0),
  };
}

export function isMultiDay(event: ScheduleEvent, now: Date): boolean {
  const start = parseDateTime(event.startAt);
  const end = effectiveEnd(event, now);
  if (!start || !end) return false;
  return differenceInCalendarDays(end, start) >= 1;
}

export function singleDayEvents(events: ScheduleEvent[], date: Date, now: Date): ScheduleEvent[] {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return events
    .filter((event) => !isCancelled(event))
    .filter((event) => !isMultiDay(event, now))
    .filter((event) => {
      const start = parseDateTime(event.startAt);
      const end = effectiveEnd(event, now);
      if (!start || !end) return false;
      return start < dayEnd && end > dayStart;
    })
    .sort((a, b) => {
      const aStart = parseDateTime(a.startAt)?.getTime() ?? 0;
      const bStart = parseDateTime(b.startAt)?.getTime() ?? 0;
      return aStart - bStart;
    });
}

export function weekSpanSegments(events: ScheduleEvent[], weekStart: Date, now: Date): MonthSpan[] {
  const weekEnd = addDays(weekStart, 7);
  const spans: MonthSpan[] = [];
  for (const event of events) {
    if (isCancelled(event)) continue;
    const start = parseDateTime(event.startAt);
    const end = effectiveEnd(event, now);
    if (!start || !end) continue;
    if (start >= weekEnd || end <= weekStart) continue;
    if (!isMultiDay(event, now) && start >= weekStart && end <= weekEnd) continue;
    const startIndex = Math.max(0, differenceInCalendarDays(start, weekStart));
    const endIndex = Math.min(6, differenceInCalendarDays(new Date(end.getTime() - 1), weekStart));
    if (endIndex < startIndex) continue;
    spans.push({
      event,
      startIndex,
      endIndex,
      row: 0,
      continuesBefore: start < weekStart,
      continuesAfter: end > weekEnd,
    });
  }
  spans.sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const rows: boolean[][] = [];
  for (const span of spans) {
    let row = rows.findIndex((occupied) => {
      for (let i = span.startIndex; i <= span.endIndex; i += 1) {
        if (occupied[i]) return false;
      }
      return true;
    });
    if (row === -1) {
      row = rows.length;
      rows.push(Array(7).fill(false));
    }
    for (let i = span.startIndex; i <= span.endIndex; i += 1) {
      rows[row][i] = true;
    }
    span.row = row;
  }
  return spans;
}

export function spanRowCount(spans: MonthSpan[]): number {
  return spans.length ? Math.max(...spans.map((span) => span.row)) + 1 : 0;
}

export function isCasualActive(event: ScheduleEvent, now: Date): boolean {
  if (event.type !== "CASUAL" || isCancelled(event)) return false;
  const start = parseDateTime(event.startAt);
  const end = parseDateTime(event.endAt);
  return !!start && !!end && start <= now && now < end;
}

export function isEventInDay(event: ScheduleEvent, date: Date, now: Date): boolean {
  return daySegment(event, date, now) !== null;
}

export function eventTypeColor(type: EventType): string {
  switch (type) {
    case "IMPORTANT":
      return "var(--accent)";
    case "CASUAL":
      return "var(--gold)";
    case "CONTAINER":
      return "var(--blue)";
    case "GOAL":
      return "var(--plum)";
    default:
      return "var(--pine)";
  }
}

export function priorityWeight(priority: Priority): number {
  return priority === "HIGH" ? 3 : priority === "MEDIUM" ? 2 : 1;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

export interface ColumnPlacement {
  column: number;
  columnCount: number;
}

/**
 * Assign horizontal columns to overlapping intervals. Items are grouped into
 * clusters; within one cluster every item receives the same column count so the
 * blocks keep a consistent width.
 */
export function assignColumns(items: Array<{ start: number; end: number }>): ColumnPlacement[] {
  const result: ColumnPlacement[] = items.map(() => ({ column: 0, columnCount: 1 }));
  const order = items.map((item, index) => ({ item, index })).sort((a, b) => a.item.start - b.item.start);
  let cluster: Array<{ item: { start: number; end: number }; index: number }> = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const placements = new Map<number, number>();
    for (const entry of cluster) {
      let column = columnEnds.findIndex((end) => entry.item.start >= end - 0.01);
      if (column === -1) {
        column = columnEnds.length;
      }
      columnEnds[column] = entry.item.end;
      placements.set(entry.index, column);
    }
    const count = Math.max(1, columnEnds.length);
    for (const entry of cluster) {
      result[entry.index] = { column: placements.get(entry.index) ?? 0, columnCount: count };
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const entry of order) {
    if (cluster.length && entry.item.start >= clusterEnd) {
      flush();
    }
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.item.end);
  }
  flush();
  return result;
}
