"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { Button } from "@mui/material";
import { Clock, CloudSun, Flag, Layers, LocateFixed, MapPin, Target } from "lucide-react";
import type { EventType, Holiday, Priority, ScheduleEvent, WeatherDay } from "@/lib/types";
import { EVENT_TYPE_META } from "@/lib/types";
import { formatDuration, formatTime, isSameDay, minutesOfDay, parseDateTime } from "@/lib/dates";
import { isCasualActive, layoutDay, type DaySegment } from "@/lib/layout";
import { WeatherChip, weatherIsWet } from "./weather";

const HOUR_WIDTH = 76;
const DAY_MINUTES = 24 * 60;

interface DayViewProps {
  events: ScheduleEvent[];
  date: Date;
  now: Date;
  holiday: Holiday | null;
  weatherDay: WeatherDay | null;
  weatherCity: string | null;
  loading: boolean;
  onCreateAt: (start: Date, priority: Priority, type?: EventType) => void;
  onOpenEvent: (event: ScheduleEvent) => void;
  onMoveEvent: (event: ScheduleEvent, start: Date, end: Date) => void;
}

const LANE_META: Record<Priority, { label: string; english: string }> = {
  HIGH: { label: "高优先", english: "FOCUS" },
  MEDIUM: { label: "中优先", english: "STEADY" },
  LOW: { label: "低优先", english: "LIGHT" },
};

export function DayView({ events, date, now, holiday, weatherDay, weatherCity, loading, onCreateAt, onOpenEvent, onMoveEvent }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutDay(events, date, now), [events, date, now]);
  const isToday = isSameDay(date, now);

  const goalRowCount = layout.goals.length
    ? Math.max(...layout.goals.map((segment) => segment.row)) + 1
    : 1;
  const goalBandHeight = 16 + goalRowCount * 42;


  const scrollToNow = () => {
    const element = scrollRef.current;
    if (!element) return;
    const focusMinutes = isToday ? Math.max(0, minutesOfDay(now) - 90) : 7 * 60;
    element.scrollTo({ left: Math.max(0, (focusMinutes / 60) * HOUR_WIDTH - 16), behavior: "smooth" });
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const focusMinutes = isSameDay(date, new Date()) ? Math.max(0, minutesOfDay(new Date()) - 90) : 7 * 60;
    element.scrollLeft = Math.max(0, (focusMinutes / 60) * HOUR_WIDTH - 16);
    // Re-centre only when the selected day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toDateString()]);

  const handleTrackClick = (
    event: ReactMouseEvent<HTMLDivElement>,
    priority: Priority,
    type?: EventType,
  ) => {
    if ((event.target as HTMLElement).closest("[data-event]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const rawMinutes = (x / HOUR_WIDTH) * 60;
    const minutes = Math.max(0, Math.min(DAY_MINUTES - 15, Math.floor(rawMinutes / 15) * 15));
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(minutes);
    onCreateAt(start, priority, type);
  };

  return (
    <section className={`view-card day-view ${loading ? "is-loading" : ""}`}>
      <div className="legend-bar day-toolbar" aria-label="事件图例">
        {(["NORMAL", "IMPORTANT", "CASUAL", "CONTAINER", "GOAL"] as EventType[]).map((type) => (
          <span key={type} className={`legend-item legend-${type.toLowerCase()}`}>
            <i />
            {EVENT_TYPE_META[type].short}
          </span>
        ))}
        <span className="legend-item legend-now"><i />现在</span>
        <div className="legend-actions">
          {weatherDay ? <WeatherChip day={weatherDay} city={weatherCity} /> : null}
          {holiday ? <span className="holiday-banner"><i />{holiday.name}</span> : null}
          <Button size="small" variant="outlined" onClick={scrollToNow} startIcon={<LocateFixed size={14} />}>
            {isToday ? "回到现在" : "从早上看起"}
          </Button>
        </div>
      </div>

      {weatherDay && weatherIsWet(weatherDay) && events.some((event) => event.weatherSensitive && event.status !== "CANCELLED") ? (
        <div className="weather-advisory">
          <WeatherChip day={weatherDay} city={weatherCity} compact />
          <span>有降水，天气敏感安排可能受影响</span>
        </div>
      ) : null}

      <div className="day-scroll" ref={scrollRef}>
        <div className="day-canvas">
          <div className="day-row day-ruler-row">
            <div className="day-gutter day-gutter-head">
              <Clock size={13} />
              <span>时间</span>
            </div>
            <div className="day-track day-ruler" style={{ width: DAY_MINUTES / 60 * HOUR_WIDTH }}>
              {Array.from({ length: 25 }, (_, hour) => (
                <span
                  key={hour}
                  className={`hour-mark ${hour % 2 === 0 ? "major" : ""}`}
                  style={{ left: hour * HOUR_WIDTH }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
              {isToday ? (
                <span
                  className="now-pill"
                  style={{ left: (minutesOfDay(now) / 60) * HOUR_WIDTH }}
                >
                  现在 {formatTime(now)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="day-row day-goal-row">
            <div className="day-gutter day-goal-gutter">
              <Target size={13} />
              <span>目标</span>
              {layout.goals[0] ? (
                <span className="goal-gutter-title" title={layout.goals[0].event.title}>
                  {layout.goals[0].event.title}
                </span>
              ) : null}
            </div>
            <div
              className="day-track day-goal-track"
              style={{
                width: DAY_MINUTES / 60 * HOUR_WIDTH,
                height: goalBandHeight,
                "--hour-width": `${HOUR_WIDTH}px`,
              } as CSSProperties}
              onClick={(event) => handleTrackClick(event, "MEDIUM", "GOAL")}
            >
              <span className="lane-watermark">GOAL</span>
              {isToday ? <NowLine now={now} /> : null}
              {layout.goals.map((segment) => (
                <GoalBlock
                  key={`goal-${segment.event.id}`}
                  segment={segment}
                  now={now}
                  onOpen={onOpenEvent}
                />
              ))}
              {layout.goals.length === 0 ? (
                <span className="lane-empty-hint">点击新建目标</span>
              ) : null}
            </div>
          </div>

          <div className="day-lanes">
            {layout.lanes.map((lane) => {
              const laneHeight = 16 + lane.rowCount * 68;
              return (
                <div className={`day-row day-lane-row lane-${lane.key.toLowerCase()}`} key={lane.key}>
                  <div className="day-gutter day-lane-label">
                    <span>{LANE_META[lane.key].label}</span>
                    <small>{LANE_META[lane.key].english}</small>
                  </div>
                  <div
                    className="day-track day-lane-track"
                    style={{
                      width: DAY_MINUTES / 60 * HOUR_WIDTH,
                      height: laneHeight,
                      "--hour-width": `${HOUR_WIDTH}px`,
                    } as CSSProperties}
                    onClick={(event) => handleTrackClick(event, lane.key)}
                  >
                    {isToday ? <NowLine now={now} /> : null}
                    {lane.segments.map((segment) => (
                      <EventBlock
                        key={segment.event.id}
                        segment={segment}
                        now={now}
                        onOpen={onOpenEvent}
                        onMove={onMoveEvent}
                        containerEndMin={segment.event.parentId
                          ? layout.containers.find((container) => container.event.id === segment.event.parentId)?.endMin ?? null
                          : null}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="container-shell-layer" aria-hidden={layout.containers.length === 0}>
              {layout.containers.map((segment) => (
                <ContainerShell
                  key={`shell-${segment.event.id}`}
                  segment={segment}
                  onOpen={onOpenEvent}
                />
              ))}
            </div>
          </div>
        </div>
      </div>


    </section>
  );
}

function NowLine({ now }: { now: Date }) {
  return (
    <div className="now-line" style={{ left: (minutesOfDay(now) / 60) * HOUR_WIDTH }}>
      <i />
    </div>
  );
}

function ContentMeta({ segment, now }: { segment: DaySegment; now: Date }) {
  const { event } = segment;
  const start = parseDateTime(event.startAt);
  const end = parseDateTime(event.endAt);
  if (event.type === "GOAL" && !event.endAt) {
    return <span className="event-meta">进行中 · 已 {eventElapsed(event, now)}</span>;
  }
  return (
    <span className="event-meta">
      {segment.continuesBefore ? "← " : ""}
      {formatTime(start)}–{formatTime(end)}
      {segment.continuesAfter ? " →" : ""}
    </span>
  );
}

function eventElapsed(event: ScheduleEvent, now: Date): string {
  const start = parseDateTime(event.startAt);
  if (!start) return "0 分钟";
  const end = event.goalCompleted && event.completedAt ? new Date(event.completedAt) : now;
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  return formatDuration(minutes);
}

function estimateTitleWidth(title: string): number {
  let width = 20;
  for (const char of title) {
    width += /[\u3400-\u9fff]/.test(char) ? 10 : 5.8;
  }
  return Math.min(210, width);
}

function EventBlock({
  segment,
  now,
  onOpen,
  onMove,
  containerEndMin,
}: {
  segment: DaySegment;
  now: Date;
  onOpen: (event: ScheduleEvent) => void;
  onMove: (event: ScheduleEvent, start: Date, end: Date) => void;
  containerEndMin: number | null;
}) {
  const { event } = segment;
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startAt: Date; endAt: Date; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const durationWidth = ((segment.endMin - segment.startMin) / 60) * HOUR_WIDTH - 2;
  const left = (segment.startMin / 60) * HOUR_WIDTH + 1;
  const desiredWidth = Math.max(46, durationWidth, estimateTitleWidth(event.title));
  const containerLimit = containerEndMin === null
    ? Number.POSITIVE_INFINITY
    : (containerEndMin / 60) * HOUR_WIDTH - left - 4;
  const width = Math.max(20, Math.min(desiredWidth, containerLimit));
  const extended = width > durationWidth + 1;
  const top = 8 + segment.row * 68;
  const casualActive = isCasualActive(event, now);
  const draggable = !segment.continuesBefore && !segment.continuesAfter && event.status !== "DONE" && event.status !== "CANCELLED";
  const classes = [
    "event-block",
    `type-${event.type.toLowerCase()}`,
    `priority-${event.priority.toLowerCase()}`,
    width < 72 ? "is-narrow" : "",
    extended ? "is-extended" : "",
    draggable ? "is-draggable" : "",
    dragging ? "is-dragging" : "",
    event.status === "DONE" ? "is-done" : "",
    casualActive ? "casual-live" : "",
    segment.continuesAfter ? "continue-after" : "",
    segment.continuesBefore ? "continue-before" : "",
    event.parentId ? "is-child" : "",
  ].filter(Boolean).join(" ");

  const handlePointerDown = (pointerEvent: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggable || pointerEvent.pointerType === "touch" || pointerEvent.button !== 0) return;
    const startAt = parseDateTime(event.startAt);
    const endAt = parseDateTime(event.endAt);
    if (!startAt || !endAt) return;
    dragRef.current = { startX: pointerEvent.clientX, startAt, endAt, moved: false };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const handlePointerMove = (pointerEvent: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = pointerEvent.clientX - drag.startX;
    if (!drag.moved && Math.abs(deltaX) < 4) return;
    drag.moved = true;
    setDragging(true);
    setDragOffset(deltaX);
    pointerEvent.preventDefault();
  };

  const finishDrag = (pointerEvent: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    setDragOffset(0);
    if (!drag || !drag.moved || cancelled) return;
    const rawMinutes = (pointerEvent.clientX - drag.startX) / HOUR_WIDTH * 60;
    const dayStart = new Date(drag.startAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const minMinutes = -((drag.startAt.getTime() - dayStart.getTime()) / 60000);
    const maxMinutes = (dayEnd.getTime() - drag.endAt.getTime()) / 60000;
    const minutes = Math.min(maxMinutes, Math.max(minMinutes, Math.round(rawMinutes / 5) * 5));
    if (minutes === 0) return;
    suppressClickRef.current = true;
    onMove(
      event,
      new Date(drag.startAt.getTime() + minutes * 60000),
      new Date(drag.endAt.getTime() + minutes * 60000),
    );
  };

  return (
    <button
      type="button"
      data-event
      className={classes}
      style={{
        left,
        top,
        width,
        height: 58,
        transform: dragging ? `translateX(${dragOffset}px)` : undefined,
        zIndex: dragging ? 20 : undefined,
      }}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onOpen(event);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(pointerEvent) => finishDrag(pointerEvent)}
      onPointerCancel={(pointerEvent) => finishDrag(pointerEvent, true)}
      title={`${event.title} · ${formatTime(parseDateTime(event.startAt))}–${formatTime(parseDateTime(event.endAt))}${extended ? "（为保证标题可读，气泡宽度略宽于实际时长）" : ""}${draggable ? " · 横向拖动可平移时间" : ""}`}
    >
      <span className="event-topline">
        <span className="event-title">{event.title}</span>
        {event.weatherSensitive ? <CloudSun size={11} className="event-weather" /> : null}
        {event.dueAt ? <Flag size={11} className="event-flag" /> : null}
      </span>
      <ContentMeta segment={segment} now={now} />
      {width > 190 ? (
        <span className="event-extra">
          {event.location ? <><MapPin size={10} />{event.location}</> : <><Clock size={10} />{formatDuration(segment.endMin - segment.startMin)}</>}
        </span>
      ) : null}
    </button>
  );
}

function GoalBlock({
  segment,
  now,
  onOpen,
}: {
  segment: DaySegment;
  now: Date;
  onOpen: (event: ScheduleEvent) => void;
}) {
  const { event } = segment;
  const durationWidth = ((segment.endMin - segment.startMin) / 60) * HOUR_WIDTH - 2;
  const width = Math.max(58, durationWidth, estimateTitleWidth(event.title));
  const extended = width > durationWidth + 1;
  const long = durationWidth > 300;
  const left = (segment.startMin / 60) * HOUR_WIDTH + 1;
  const top = 8 + segment.row * 42;
  return (
    <button
      type="button"
      data-event
      className={`goal-block ${extended ? "is-extended" : ""} ${long ? "is-long" : ""}`}
      style={{ left, top, width }}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onOpen(event);
      }}
      title={`${event.title} · 目标进行中`}
    >
      <span className="goal-title"><Target size={12} />{event.title}</span>
      <span className="goal-meta">目标 · 已投入 {eventElapsed(event, now)}</span>
    </button>
  );
}

function ContainerShell({
  segment,
  onOpen,
}: {
  segment: DaySegment;
  onOpen: (event: ScheduleEvent) => void;
}) {
  const { event } = segment;
  const left = (segment.startMin / 60) * HOUR_WIDTH + 1;
  const width = Math.max(24, ((segment.endMin - segment.startMin) / 60) * HOUR_WIDTH - 2);
  return (
    <button
      type="button"
      data-event
      className={`container-shell ${event.goalCompleted ? "is-complete-goal" : ""}`}
      style={{ left, width }}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onOpen(event);
      }}
      title={event.title}
    >
      <span className="container-shell-head">
        {event.goalCompleted ? <Target size={12} /> : <Layers size={12} />}
        <span>{event.title}</span>
        <em>{event.goalCompleted ? "目标已完成" : "容器"}</em>
      </span>
    </button>
  );
}
