"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, differenceInCalendarDays, format, startOfMonth } from "date-fns";
import { RefreshCw, WifiOff } from "lucide-react";
import type {
  Analysis,
  EventType,
  HeartbeatResponse,
  Holiday,
  HolidayRegion,
  NlpDraft,
  Priority,
  Profile,
  Reminder,
  ScheduleEvent,
  Suggestion,
  ViewMode,
  Weather,
} from "@/lib/types";
import {
  formatDuration,
  getViewRange,
  isSameDay,
  parseDateTime,
  shiftDate,
  startOfToday,
  toApiDate,
  toApiDateTime,
} from "@/lib/dates";
import { effectiveEnd } from "@/lib/layout";
import {
  ApiRequestError,
  applySchedule,
  createEvent,
  fetchEvents,
  fetchHolidays,
  fetchOverview,
  fetchProfile,
  fetchWeather,
  moveEvent,
} from "@/lib/api";
import { usePresence } from "@/lib/use-presence";
import { useToasts, ToastStack } from "./toast";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { EventPanel, type CreatePrefill, type PanelState } from "./event-panel";
import { ConflictDialog } from "./conflict-dialog";
import { SettingsDialog } from "./settings-dialog";
import { ReminderHost } from "./reminder-host";
import { NlpDialog } from "./nlp-dialog";
import { MuiProvider } from "./mui-provider";

interface ConflictState {
  event: ScheduleEvent;
  analysis: Analysis;
}

export function PlannerApp() {
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayRegion, setHolidayRegion] = useState<HolidayRegion>("MO");
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [applyingConflict, setApplyingConflict] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [nlpOpen, setNlpOpen] = useState(false);
  const [strongQueue, setStrongQueue] = useState<Reminder[]>([]);
  const { toasts, push, dismiss } = useToasts();
  const snoozeTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const loadProfile = useCallback(async () => {
    setProfileError(null);
    try {
      const next = await fetchProfile();
      setProfile(next);
      setHolidayRegion(next.holidayRegion);
    } catch (error) {
      setProfileError(error instanceof ApiRequestError ? error.message : "无法读取你的设置");
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem("smartplanner:sidebar-collapsed") === "true");
    } catch {
      // localStorage can be unavailable in private browsing; the default is fine.
    }
    const media = window.matchMedia("(min-width: 961px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);



  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem("smartplanner:sidebar-collapsed", String(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => {
    snoozeTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const viewRange = useMemo(() => getViewRange(selectedDate, view), [selectedDate, view]);
  const years = useMemo(() => {
    const set = new Set<number>();
    set.add(selectedDate.getFullYear());
    set.add(viewRange.from.getFullYear());
    set.add(viewRange.to.getFullYear());
    return Array.from(set).sort();
  }, [selectedDate, viewRange.from, viewRange.to]);
  const yearsKey = years.join(",");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      fetchEvents(toApiDateTime(viewRange.from), toApiDateTime(viewRange.to)),
      fetchOverview(toApiDate(startOfToday())),
    ])
      .then(([nextEvents, nextOverview]) => {
        if (ignore) return;
        setEvents(nextEvents);
        setOverview(nextOverview);
      })
      .catch((error) => {
        if (ignore) return;
        setLoadError(error instanceof ApiRequestError ? error.message : "读取日程失败，请检查后端服务");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [selectedDate, view, refreshKey, viewRange.from, viewRange.to]);

  useEffect(() => {
    let ignore = false;
    Promise.all(years.map((year) => fetchHolidays(year)))
      .then((calendars) => {
        if (ignore) return;
        const seen = new Set<string>();
        const merged: Holiday[] = [];
        for (const calendar of calendars) {
          for (const holiday of calendar.holidays) {
            const key = `${holiday.date}-${holiday.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(holiday);
          }
        }
        setHolidays(merged);
      })
      .catch(() => {
        if (!ignore) setHolidays([]);
      });
    return () => {
      ignore = true;
    };
  }, [yearsKey, holidayRegion, years]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const weatherRange = useMemo(() => {
    // Fetch one 16-day window from today. This keeps the selected day, the
    // current week, and every event inside its foresight window covered by the
    // same request.
    const today = startOfToday();
    return { from: today, to: addDays(today, 14) };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchWeather(
      toApiDate(weatherRange.from),
      toApiDate(weatherRange.to),
      profile?.weatherProvince ?? "MACAU",
    )
      .then((next) => {
        if (!ignore) setWeather(next);
      })
      .catch(() => {
        if (!ignore) setWeather(null);
      });
    return () => {
      ignore = true;
    };
  }, [weatherRange.from, weatherRange.to, profile?.weatherProvince, refreshKey]);

  const handleHeartbeat = useCallback((response: HeartbeatResponse) => {
    for (const reminder of response.reminders) {
      if (reminder.strength === "STRONG") {
        setStrongQueue((queue) => queue.some((item) => item.id === reminder.id) ? queue : [...queue, reminder]);
      } else {
        push({
          tone: "reminder",
          title: reminder.title,
          message: reminder.message,
          duration: 11_000,
        });
      }
    }
  }, [push]);

  const presence = usePresence({
    enabled: !!profile,
    idleThresholdSeconds: profile?.idleThresholdSeconds ?? 90,
    onHeartbeat: handleHeartbeat,
  });

  const openCreate = useCallback((prefill: CreatePrefill) => {
    setPanel({ mode: "create", prefill, key: `create-${Date.now()}` });
    setSidebarOpen(false);
  }, []);

  const defaultCreateStart = useCallback((): Date => {
    const nowDate = new Date();
    if (isSameDay(selectedDate, nowDate)) {
      const start = new Date(nowDate);
      start.setSeconds(0, 0);
      start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30);
      return start;
    }
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    return start;
  }, [selectedDate]);

  const openCreateAt = useCallback((start: Date, priority: Priority = "MEDIUM", type?: EventType) => {
    openCreate({ start, priority, type });
  }, [openCreate]);

  const openEvent = useCallback((event: ScheduleEvent) => {
    setPanel({ mode: "view", event, key: `view-${event.id}-${Date.now()}` });
    setSidebarOpen(false);
  }, []);

  const openAddChild = useCallback((container: ScheduleEvent, prefill: CreatePrefill) => {
    openCreate({
      ...prefill,
      type: "NORMAL",
      priority: prefill.priority ?? "LOW",
      parentId: container.id,
    });
  }, [openCreate]);

  const handleSaved = useCallback((event: ScheduleEvent, analysis: Analysis, wasCreateOverride?: boolean) => {
    const wasCreate = wasCreateOverride ?? panel?.mode === "create";
    setPanel(null);
    refresh();
    if (!analysis.engineAvailable) {
      push({
        tone: "warn",
        title: wasCreate ? "安排已保存" : "修改已保存",
        message: `${event.title} 已写入日程；${analysis.engineMessage ?? "排期引擎暂不可用。"}`,
        duration: 9000,
      });
      return;
    }
    const needsDialog = analysis.conflicts.length > 0 || analysis.holidayWarnings.some((warning) => warning.mode === "AVOID");
    if (needsDialog) {
      setConflict({ event, analysis });
    }
    if (analysis.holidayWarnings.length && !needsDialog) {
      push({
        tone: "warn",
        title: "节假日提醒",
        message: analysis.holidayWarnings[0].message,
        duration: 10_000,
      });
    }
    if (analysis.deadlineWarning && !needsDialog) {
      push({
        tone: "warn",
        title: "DDL 缓冲提醒",
        message: analysis.deadlineWarning,
        duration: 10_000,
      });
    }
    if (event.weatherSensitive && weather) {
      const start = parseDateTime(event.startAt);
      const day = start ? weather.days.find((item) => item.date === toApiDate(start)) : null;
      const daysUntil = start ? differenceInCalendarDays(start, startOfToday()) : -1;
      const lookahead = event.lookaheadDays || 1;
      if (day && daysUntil >= 0 && daysUntil <= lookahead && (day.rainy || day.snowy || day.stormy || (day.precipitationProbability ?? 0) >= 50)) {
        push({
          tone: "warn",
          title: "天气提醒",
          message: `${day.condition}，降水概率 ${day.precipitationProbability ?? 0}%，「${event.title}」是天气敏感安排。`,
          duration: 10_000,
        });
      }
    }
    if (!needsDialog) {
      push({
        tone: "success",
        title: wasCreate ? "新安排已排入" : "安排已更新",
        message: `${event.title} · ${format(parseDateTime(event.startAt) ?? new Date(), "M月d日 HH:mm")}`,
      });
    }
  }, [panel?.mode, push, refresh, weather]);

  const handleNlpCreate = useCallback(async (draft: NlpDraft) => {
    const start = parseDateTime(draft.startAt);
    if (!start) {
      push({ tone: "error", title: "无法创建", message: "这句话里没有可用的开始时间" });
      return;
    }
    const end = parseDateTime(draft.endAt);
    setNlpOpen(false);
    try {
      const response = await createEvent({
        title: draft.title || "新安排",
        notes: draft.notes,
        type: draft.type,
        priority: draft.priority,
        startAt: toApiDateTime(start),
        endAt: draft.type === "GOAL" ? null : toApiDateTime(end ?? new Date(start.getTime() + 60 * 60 * 1000)),
        dueAt: null,
        parentId: null,
        location: draft.location ?? "",
        weatherSensitive: false,
        lookaheadDays: 0,
      });
      handleSaved(response.event, response.analysis, true);
    } catch (error) {
      push({
        tone: "error",
        title: "创建失败",
        message: error instanceof ApiRequestError ? error.message : "日程暂时没有保存成功",
      });
    }
  }, [handleSaved, push]);

  const handleComplete = useCallback((event: ScheduleEvent) => {
    setPanel({ mode: "view", event, key: `view-${event.id}-${Date.now()}` });
    refresh();
    push({
      tone: "success",
      title: event.goalCompleted ? "目标达成，已转为容器" : "已标记完成",
      message: event.goalCompleted
        ? `「${event.title}」的实际投入已经记录，之后可以继续往里放事件。`
        : `「${event.title}」完成得很利落。`,
    });
  }, [push, refresh]);

  const handleDeleted = useCallback((id: number, detachedChildren: number) => {
    setPanel(null);
    refresh();
    push({
      tone: "success",
      title: "安排已删除",
      message: detachedChildren > 0 ? `${detachedChildren} 个并行子事件已转为独立事件，不会丢。` : undefined,
    });
  }, [push, refresh]);

  const handleMoveEvent = useCallback(async (event: ScheduleEvent, start: Date, end: Date) => {
    try {
      const result = await moveEvent(event.id, toApiDateTime(start), toApiDateTime(end));
      refresh();
      if (!result.analysis.engineAvailable) {
        push({
          tone: "warn",
          title: "时间已调整",
          message: result.analysis.engineMessage ?? "排期引擎暂不可用，可稍后刷新查看冲突。",
        });
        return;
      }
      const needsDialog = result.analysis.conflicts.length > 0
        || result.analysis.holidayWarnings.some((warning) => warning.mode === "AVOID");
      if (needsDialog) {
        setConflict({ event: result.event, analysis: result.analysis });
      } else {
        push({
          tone: "success",
          title: "时间已调整",
          message: `${result.event.title} · ${format(parseDateTime(result.event.startAt) ?? start, "M月d日 HH:mm")}`,
        });
      }
    } catch (moveError) {
      push({
        tone: "error",
        title: "拖动没有生效",
        message: moveError instanceof ApiRequestError ? moveError.message : "请稍后再试",
      });
    }
  }, [push, refresh]);

  const handleApplyConflict = useCallback(async (suggestion: Suggestion) => {
    if (!conflict) return;
    setApplyingConflict(true);
    try {
      const result = await applySchedule(
        suggestion.changes.map((change) => ({
          eventId: change.eventId,
          startAt: change.startAt,
          endAt: change.endAt,
        })),
        conflict.event.id,
      );
      setConflict(null);
      refresh();
      push({
        tone: "success",
        title: "已按你的确认调整",
        message: suggestion.label,
      });
      if (result.analysis && !result.analysis.engineAvailable) {
        push({
          tone: "warn",
          title: "调整已保存",
          message: result.analysis.engineMessage ?? "排期引擎暂时不可用，可稍后刷新查看。",
        });
      }
      if (result.analysis?.conflicts?.length) {
        const anchor = result.events.find((event) => event.id === conflict.event.id) ?? conflict.event;
        setConflict({ event: anchor, analysis: result.analysis });
      }
    } catch (error) {
      push({
        tone: "error",
        title: "调整没有生效",
        message: error instanceof ApiRequestError ? error.message : "请稍后再试一次",
      });
    } finally {
      setApplyingConflict(false);
    }
  }, [conflict, push, refresh]);

  const handleSettingsSaved = useCallback((updated: Profile) => {
    setProfile(updated);
    setHolidayRegion(updated.holidayRegion);
    setSettingsOpen(false);
    refresh();
    push({ tone: "success", title: "设置已保存", message: "新的节奏和提醒偏好已经生效。" });
  }, [push, refresh]);



  const handleDismissStrong = useCallback((id: string) => {
    setStrongQueue((queue) => queue.filter((item) => item.id !== id));
  }, []);

  const handleSnoozeStrong = useCallback((reminder: Reminder) => {
    setStrongQueue((queue) => queue.filter((item) => item.id !== reminder.id));
    const timer = setTimeout(() => {
      setStrongQueue((queue) => queue.some((item) => item.id === reminder.id) ? queue : [...queue, reminder]);
    }, 5 * 60 * 1000);
    snoozeTimers.current.push(timer);
    push({ tone: "info", title: "已延后 5 分钟", message: "这段时间先专注手上的事。" });
  }, [push]);

  const holiday = holidays.find((item) => item.date === toApiDate(selectedDate) && item.kind === "PUBLIC_HOLIDAY") ?? null;
  const weatherDay = weather?.days.find((item) => item.date === toApiDate(selectedDate)) ?? null;
  const weatherByDate = useMemo(
    () => Object.fromEntries((weather?.days ?? []).map((day) => [day.date, day])),
    [weather],
  );

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      const target = keyEvent.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (panel || conflict || settingsOpen) return;
      if (keyEvent.key === "n" || keyEvent.key === "N") {
        keyEvent.preventDefault();
        openCreate({ start: defaultCreateStart(), priority: "MEDIUM" });
      } else if (keyEvent.key === "t" || keyEvent.key === "T") {
        keyEvent.preventDefault();
        setSelectedDate(startOfToday());
      } else if (keyEvent.key === "1") {
        setView("day");
      } else if (keyEvent.key === "2") {
        setView("week");
      } else if (keyEvent.key === "3") {
        setView("month");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [conflict, defaultCreateStart, openCreate, panel, settingsOpen]);

  if (!profile && profileError) {
    return (
      <div className="boot-screen error-screen">
        <BrandMark />
        <p className="boot-kicker">连接没有搭上</p>
        <h1>日程暂时没有打开</h1>
        <p className="boot-copy">{profileError}。确认 Java 服务运行在 8080 端口后，再试一次。</p>
        <button type="button" className="primary-button" onClick={() => { void loadProfile(); refresh(); }}>
          <RefreshCw size={16} /> 重新连接
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="boot-screen">
        <BrandMark />
        <p className="boot-kicker">SMARTPLANNER / 日序</p>
        <h1>正在把今天摊开…</h1>
        <div className="boot-dots"><i /><i /><i /></div>
      </div>
    );
  }

  const collapsedOnDesktop = sidebarCollapsed && isDesktop;

  return (
    <MuiProvider>
    <div className={`app-shell ${collapsedOnDesktop ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setSidebarOpen(false);
        }}
        holidays={holidays}
        overview={overview}
        profile={profile}
        presenceActive={presence.active}
        presenceOnline={presence.online}
        mobileOpen={sidebarOpen}
        collapsed={collapsedOnDesktop}
        onToggleCollapse={toggleSidebar}
        onCloseMobile={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenEvent={openEvent}
      />

      <div className="app-main">
        <Topbar
          view={view}
          onViewChange={setView}
          selectedDate={selectedDate}
          profile={profile}
          holiday={holiday}
          loading={loading}
          presenceActive={presence.active}
          presenceOnline={presence.online}
          onPrev={() => setSelectedDate((date) => shiftDate(date, view, -1))}
          onNext={() => setSelectedDate((date) => shiftDate(date, view, 1))}
          onToday={() => setSelectedDate(startOfToday())}
          onAdd={() => openCreate({ start: defaultCreateStart(), priority: "MEDIUM" })}
          onQuickAdd={() => setNlpOpen(true)}
          onOpenMenu={() => setSidebarOpen(true)}
          sidebarCollapsed={collapsedOnDesktop}
          onToggleSidebar={toggleSidebar}
        />

        <main className="workspace">
          {loadError ? (
            <div className="error-banner">
              <span><WifiOff size={16} /> {loadError}</span>
              <button type="button" onClick={refresh}><RefreshCw size={14} /> 重试</button>
            </div>
          ) : null}

          {view === "day" ? (
            <DayView
              events={events}
              date={selectedDate}
              now={now}
              holiday={holiday}
              weatherDay={weatherDay}
              weatherCity={weather?.city ?? null}
              loading={loading}
              onCreateAt={openCreateAt}
              onOpenEvent={openEvent}
              onMoveEvent={handleMoveEvent}
            />
          ) : view === "week" ? (
            <WeekView
              events={events}
              date={selectedDate}
              now={now}
              holidays={holidays}
              weatherByDate={weatherByDate}
              onCreateAt={openCreateAt}
              onOpenEvent={openEvent}
            />
          ) : (
            <MonthView
              events={events}
              date={selectedDate}
              now={now}
              holidays={holidays}
              onPickDay={(day) => {
                setSelectedDate(day);
                setView("day");
              }}
              onCreateAt={openCreateAt}
              onOpenEvent={openEvent}
            />
          )}

        </main>
      </div>

      {panel ? (
        <EventPanel
          panel={panel}
          events={events}
          onClose={() => setPanel(null)}
          onSaved={handleSaved}
          onCompleted={handleComplete}
          onDeleted={handleDeleted}
          onOpenEvent={openEvent}
          onAddChild={openAddChild}
        />
      ) : null}

      <ConflictDialog
        event={conflict?.event ?? null}
        analysis={conflict?.analysis ?? null}
        applying={applyingConflict}
        onClose={() => setConflict(null)}
        onApply={handleApplyConflict}
      />

      <NlpDialog
        open={nlpOpen}
        onClose={() => setNlpOpen(false)}
        onCreateDraft={(draft) => { void handleNlpCreate(draft); }}
        onUseDraft={(draft) => {
          const start = parseDateTime(draft.startAt);
          if (!start) return;
          const end = parseDateTime(draft.endAt) ?? undefined;
          setNlpOpen(false);
          openCreate({
            start,
            end,
            title: draft.title,
            notes: draft.notes,
            location: draft.location ?? undefined,
            type: draft.type,
            priority: draft.priority,
          });
        }}
      />

      <SettingsDialog
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
        onSaved={handleSettingsSaved}
      />

      <ReminderHost
        queue={strongQueue}
        onDismiss={handleDismissStrong}
        onSnooze={handleSnoozeStrong}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
    </MuiProvider>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark boot-brand" aria-hidden="true">
      <span className="brand-slab one" />
      <span className="brand-slab two" />
      <span className="brand-slab three" />
    </div>
  );
}
