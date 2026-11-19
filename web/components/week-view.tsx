"use client";

import { useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { format, getISOWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Flag, Layers, MapPin, Target } from "lucide-react";
import type { EventType, Holiday, Priority, ScheduleEvent, WeatherDay } from "@/lib/types";
import { EVENT_TYPE_META } from "@/lib/types";
import {
  dateKey,
  formatTime,
  getWeekDays,
  isSameDay,
  isWeekend,
  minutesOfDay,
  parseDateTime,
  weekdayLabel,
} from "@/lib/dates";
import { assignColumns, daySegment, isMultiDay, weekSpanSegments, type DaySegment } from "@/lib/layout";
import { EventGlyph } from "./ui";
import { WeatherIcon } from "./weather";

const HOUR_HEIGHT = 46;

interface WeekViewProps {
  events: ScheduleEvent[];
  date: Date;
  now: Date;
  holidays: Holiday[];
  weatherByDate: Record<string, WeatherDay>;
  onCreateAt: (start: Date, priority: Priority, type?: EventType) => void;
  onOpenEvent: (event: ScheduleEvent) => void;
}

export function WeekView({ events, date, now, holidays, weatherByDate, onCreateAt, onOpenEvent }: WeekViewProps) {
  const days = useMemo(() => getWeekDays(date), [date]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const spans = useMemo(() => weekSpanSegments(events, days[0], now), [events, days, now]);
  const spanRows = spans.length ? Math.max(...spans.map((span) => span.row)) + 1 : 0;
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((holiday) => map.set(holiday.date, holiday));
    return map;
  }, [holidays]);

  const perDay = useMemo(() => days.map((day) => {
    const segments: DaySegment[] = events
      .filter((event) => !isMultiDay(event, now))
      .map((event) => daySegment(event, day, now))
      .filter((segment): segment is DaySegment => !!segment);
    // Container shells span the full day column, so they must not consume a
    // side-by-side column from their children.
    const columnSegments = segments.filter((segment) => segment.event.type !== "CONTAINER");
    const placements = assignColumns(columnSegments.map((segment) => ({ start: segment.startMin, end: segment.endMin })));
    const placementById = new Map<number, { column: number; columnCount: number }>();
    columnSegments.forEach((segment, index) => {
      placementById.set(segment.event.id, placements[index]);
    });
    return segments.map((segment) => ({
      segment,
      placement: placementById.get(segment.event.id) ?? { column: 0, columnCount: 1 },
    }));
  }), [days, events, now]);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const focus = isSameDay(days[0], new Date()) ? Math.max(0, minutesOfDay(new Date()) - 120) : 7 * 60;
    element.scrollTop = (focus / 60) * HOUR_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0].toDateString()]);

  const handleColumnClick = (day: Date, clickEvent: ReactMouseEvent<HTMLDivElement>) => {
    if ((clickEvent.target as HTMLElement).closest("[data-event]")) return;
    const rect = clickEvent.currentTarget.getBoundingClientRect();
    const y = clickEvent.clientY - rect.top;
    const rawMinutes = (y / (24 * HOUR_HEIGHT)) * 24 * 60;
    const minutes = Math.max(0, Math.min(23 * 60 + 45, Math.floor(rawMinutes / 15) * 15));
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(minutes);
    onCreateAt(start, "MEDIUM");
  };

  return (
    <section className="view-card week-view">
      <div className="legend-bar">
        {(["NORMAL", "IMPORTANT", "CASUAL", "CONTAINER", "GOAL"] as EventType[]).map((type) => (
          <span key={type} className={`legend-item legend-${type.toLowerCase()}`}><i />{EVENT_TYPE_META[type].short}</span>
        ))}
      </div>

      <div className="week-h-scroll">
        <div className="week-canvas">
          <div className="week-header">
            <div className="week-gutter week-gutter-head">
              <span>{format(days[0], "M月", { locale: zhCN })}</span>
              <small>第 {getISOWeek(days[0])} 周</small>
            </div>
            {days.map((day) => {
              const holiday = holidayMap.get(dateKey(day));
              const publicHoliday = holiday?.kind === "PUBLIC_HOLIDAY";
              const workday = holiday?.kind === "WORKDAY";
              const weather = weatherByDate[dateKey(day)];
              return (
                <div
                  key={day.toISOString()}
                  className={[
                    "week-day-head",
                    isSameDay(day, now) ? "today" : "",
                    isWeekend(day) ? "weekend" : "",
                    publicHoliday ? "holiday" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <span className="week-weekday">{weekdayLabel(day)}</span>
                  <span className="week-date">{format(day, "d")}</span>
                  {weather ? (
                    <span className={`week-weather ${weather.rainy || weather.stormy ? "is-wet" : ""}`} title={`${weather.condition} · 降雨 ${weather.precipitationProbability ?? 0}%`}>
                      <WeatherIcon code={weather.code} size={11} />
                      {weather.tempMax !== null ? `${Math.round(weather.tempMax)}°` : weather.condition}
                      {(weather.precipitationProbability ?? 0) >= 30 ? <em>{weather.precipitationProbability}%</em> : null}
                    </span>
                  ) : null}
                  {publicHoliday ? <span className="week-holiday">{holiday?.name}</span> : null}
                  {workday ? <span className="week-workday">补班</span> : null}
                </div>
              );
            })}
          </div>

          <div className="week-allday">
            <div className="week-gutter week-allday-label">全天</div>
            <div className="week-allday-track" style={{ height: Math.max(34, 14 + spanRows * 25) }}>
              <div className="week-allday-grid" aria-hidden="true" />
              {spans.map((span) => {
                const left = (span.startIndex / 7) * 100;
                const width = ((span.endIndex - span.startIndex + 1) / 7) * 100;
                return (
                  <button
                    key={`span-${span.event.id}-${span.startIndex}`}
                    type="button"
                    data-event
                    className={`week-span type-${span.event.type.toLowerCase()} ${span.continuesBefore ? "before" : ""} ${span.continuesAfter ? "after" : ""}`}
                    style={{ left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`, top: 8 + span.row * 25 }}
                    onClick={() => onOpenEvent(span.event)}
                    title={`${span.event.title} · 跨天`}
                  >
                    {span.continuesBefore ? <ArrowLeft size={10} /> : null}
                    <EventGlyph type={span.event.type} size={10} />
                    <span>{span.event.title}</span>
                    {span.event.dueAt ? <Flag size={9} /> : null}
                    {span.continuesAfter ? <ArrowRight size={10} /> : null}
                  </button>
                );
              })}
              {spans.length === 0 ? <span className="week-allday-empty">没有跨天安排</span> : null}
            </div>
          </div>

          <div className="week-body-scroll" ref={bodyRef}>
            <div className="week-body" style={{ height: 24 * HOUR_HEIGHT }}>
              <div className="week-gutter week-time-col">
                {Array.from({ length: 24 }, (_, hour) => (
                  <span key={hour} style={{ top: hour * HOUR_HEIGHT }}>{String(hour).padStart(2, "0")}:00</span>
                ))}
              </div>
              {days.map((day, dayIndex) => {
                const entries = perDay[dayIndex];
                const containers = entries.filter(({ segment }) => segment.event.type === "CONTAINER");
                const regularEntries = entries.filter(({ segment }) => segment.event.type !== "CONTAINER");
                const isToday = isSameDay(day, now);
                return (
                  <div
                    key={`col-${day.toISOString()}`}
                    className={[
                      "week-day-col",
                      isWeekend(day) ? "weekend" : "",
                      holidayMap.get(dateKey(day))?.kind === "PUBLIC_HOLIDAY" ? "holiday" : "",
                      isToday ? "today" : "",
                    ].filter(Boolean).join(" ")}
                    style={{ backgroundSize: `100% ${HOUR_HEIGHT}px` }}
                    onClick={(event) => handleColumnClick(day, event)}
                  >
                    {containers.map(({ segment }) => {
                      const event = segment.event;
                      const top = (segment.startMin / 60) * HOUR_HEIGHT;
                      const height = Math.max(30, ((segment.endMin - segment.startMin) / 60) * HOUR_HEIGHT - 2);
                      const childCount = events.filter((item) => item.parentId === event.id).length;
                      return (
                        <button
                          key={`container-${event.id}`}
                          type="button"
                          className={`week-container-shell ${event.goalCompleted ? "is-complete-goal" : ""}`}
                          style={{ top, height }}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            onOpenEvent(event);
                          }}
                          title={event.title}
                        >
                          <span className="week-container-head">
                            {event.goalCompleted ? <Target size={10} /> : <Layers size={10} />}
                            {event.title}
                          </span>
                          <span className="week-container-meta">
                            {event.goalCompleted ? "目标已完成" : `${childCount} 个并行事件`}
                          </span>
                        </button>
                      );
                    })}
                    {isToday ? (
                      <div className="week-now-line" style={{ top: (minutesOfDay(now) / 60) * HOUR_HEIGHT }}>
                        <i />
                      </div>
                    ) : null}
                    {regularEntries.map(({ segment, placement }) => {
                      const event = segment.event;
                      const top = (segment.startMin / 60) * HOUR_HEIGHT;
                      const height = Math.max(22, ((segment.endMin - segment.startMin) / 60) * HOUR_HEIGHT - 2);
                      const left = (placement.column / placement.columnCount) * 100;
                      const width = (1 / placement.columnCount) * 100;
                      return (
                        <button
                          key={event.id}
                          type="button"
                          data-event
                          className={[
                            "week-event",
                            `type-${event.type.toLowerCase()}`,
                            `priority-${event.priority.toLowerCase()}`,
                            event.status === "DONE" ? "is-done" : "",
                            event.type === "CASUAL" && isCasualNow(event, now) ? "casual-live" : "",
                          ].filter(Boolean).join(" ")}
                          style={{
                            top,
                            height,
                            left: `calc(${left}% + 1px)`,
                            width: `calc(${width}% - 2px)`,
                          }}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            onOpenEvent(event);
                          }}
                          title={`${event.title} · ${formatTime(parseDateTime(event.startAt))}–${formatTime(parseDateTime(event.endAt))}`}
                        >
                          <span className="week-event-title">
                            <EventGlyph type={event.type} size={10} />
                            {event.title}
                          </span>
                          {height > 38 ? (
                            <span className="week-event-time">
                              {formatTime(parseDateTime(event.startAt))}
                              {event.dueAt ? <Flag size={9} /> : null}
                              {event.location ? <MapPin size={9} /> : null}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function isCasualNow(event: ScheduleEvent, now: Date): boolean {
  const start = parseDateTime(event.startAt);
  const end = parseDateTime(event.endAt);
  return !!start && !!end && start <= now && now < end;
}
