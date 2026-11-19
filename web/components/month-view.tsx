"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Flag, Plus } from "lucide-react";
import type { EventType, Holiday, Priority, ScheduleEvent } from "@/lib/types";
import { EVENT_TYPE_META } from "@/lib/types";
import {
  dateKey,
  formatMonthDay,
  formatTime,
  getMonthWeeks,
  isSameDay,
  isWeekend,
  parseDateTime,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { isCasualActive, singleDayEvents, weekSpanSegments } from "@/lib/layout";
import { EventGlyph } from "./ui";

interface MonthViewProps {
  events: ScheduleEvent[];
  date: Date;
  now: Date;
  holidays: Holiday[];
  onPickDay: (day: Date) => void;
  onCreateAt: (start: Date, priority: Priority, type?: EventType) => void;
  onOpenEvent: (event: ScheduleEvent) => void;
}

export function MonthView({ events, date, now, holidays, onPickDay, onCreateAt, onOpenEvent }: MonthViewProps) {
  const weeks = useMemo(() => getMonthWeeks(date), [date]);
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((holiday) => map.set(holiday.date, holiday));
    return map;
  }, [holidays]);

  return (
    <section className="view-card month-view">
      <div className="month-legend">
        {(["NORMAL", "IMPORTANT", "CASUAL", "CONTAINER", "GOAL"] as EventType[]).map((type) => (
          <span key={type} className={`legend-item legend-${type.toLowerCase()}`}><i />{EVENT_TYPE_META[type].short}</span>
        ))}
      </div>

      <div className="month-h-scroll">
        <div className="month-canvas">
          <div className="month-weekdays">
            {WEEKDAY_LABELS.map((label, index) => (
              <div key={label} className={index >= 5 ? "weekend" : ""}>{label}</div>
            ))}
          </div>

          {weeks.map((week) => {
            const spans = weekSpanSegments(events, week[0], now);
            const rowCount = spans.length ? Math.max(...spans.map((span) => span.row)) + 1 : 0;
            const paddingTop = 42 + rowCount * 22;
            return (
              <div className="month-week" key={week[0].toISOString()}>
                <div className="month-cells">
                  {week.map((day) => {
                    const holiday = holidayMap.get(dateKey(day));
                    const publicHoliday = holiday?.kind === "PUBLIC_HOLIDAY";
                    const workday = holiday?.kind === "WORKDAY";
                    const outside = day.getMonth() !== date.getMonth();
                    const today = isSameDay(day, now);
                    const dayEvents = singleDayEvents(events, day, now);
                    const visible = dayEvents.slice(0, 2);
                    return (
                      <div
                        key={day.toISOString()}
                        className={[
                          "month-cell",
                          outside ? "outside" : "",
                          isWeekend(day) ? "weekend" : "",
                          publicHoliday ? "holiday" : "",
                          today ? "today" : "",
                        ].filter(Boolean).join(" ")}
                        style={{ minHeight: 94 + rowCount * 22 }}
                        onClick={() => onPickDay(day)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onPickDay(day);
                          }
                        }}
                      >
                        <div className="month-cell-head" style={{ height: paddingTop }}>
                          <span className={`month-day-number ${today ? "today" : ""}`}>{format(day, "d")}</span>
                          {publicHoliday ? <span className="month-holiday-label">{holiday?.name}</span> : null}
                          {workday ? <span className="month-workday-label">补班</span> : null}
                        </div>
                        <div className="month-single-events">
                          {visible.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              className={`month-chip type-${event.type.toLowerCase()} ${event.status === "DONE" ? "is-done" : ""} ${isCasualActive(event, now) ? "casual-live" : ""}`}
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                onOpenEvent(event);
                              }}
                              title={`${event.title} · ${formatTime(parseDateTime(event.startAt))}`}
                            >
                              <span className="month-chip-dot" />
                              <span className="month-chip-time">{formatTime(parseDateTime(event.startAt))}</span>
                              <span className="month-chip-title">{event.title}</span>
                              {event.dueAt ? <Flag size={9} /> : null}
                            </button>
                          ))}
                          {dayEvents.length > 2 ? (
                            <button
                              type="button"
                              className="month-more"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                onPickDay(day);
                              }}
                            >
                              +{dayEvents.length - 2} 项
                            </button>
                          ) : null}
                          {dayEvents.length === 0 && !outside ? (
                            <button
                              type="button"
                              className="month-add-hint"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                const start = new Date(day);
                                start.setHours(9, 0, 0, 0);
                                onCreateAt(start, "MEDIUM");
                              }}
                            >
                              <Plus size={11} /> 安排
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {spans.length ? (
                  <div className="month-span-layer">
                    {spans.map((span) => (
                      <button
                        key={`${week[0].toISOString()}-${span.event.id}`}
                        type="button"
                        className={`month-span type-${span.event.type.toLowerCase()} ${span.continuesBefore ? "before" : ""} ${span.continuesAfter ? "after" : ""} ${isCasualActive(span.event, now) ? "casual-live" : ""}`}
                        style={{
                          left: `calc(${(span.startIndex / 7) * 100}% + 2px)`,
                          width: `calc(${((span.endIndex - span.startIndex + 1) / 7) * 100}% - 4px)`,
                          top: 44 + span.row * 22,
                        }}
                        onClick={() => onOpenEvent(span.event)}
                        title={`${span.event.title} · ${formatMonthDay(parseDateTime(span.event.startAt) ?? new Date())}`}
                      >
                        {span.continuesBefore ? <ArrowLeft size={10} /> : null}
                        <EventGlyph type={span.event.type} size={10} />
                        <span className="month-span-title">{span.event.title}</span>
                        {span.continuesAfter ? <ArrowRight size={10} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
