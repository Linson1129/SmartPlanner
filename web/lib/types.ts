export type ViewMode = "day" | "week" | "month";

export type EventType = "NORMAL" | "IMPORTANT" | "CASUAL" | "CONTAINER" | "GOAL";
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type EventStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type HolidayMode = "OFF" | "SOFT" | "AVOID";
export type HolidayRegion = "CN" | "MO";

export interface ScheduleEvent {
  id: number;
  title: string;
  notes: string | null;
  type: EventType;
  priority: Priority;
  status: EventStatus;
  startAt: string;
  endAt: string | null;
  dueAt: string | null;
  parentId: number | null;
  parentTitle: string | null;
  location: string | null;
  goalCompleted: boolean;
  weatherSensitive: boolean;
  lookaheadDays: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  eventId: number;
  title: string;
  type: EventType;
  startAt: string;
  endAt: string;
  overlapMinutes: number;
}

export interface HolidayWarning {
  date: string;
  name: string;
  mode: HolidayMode;
  message: string;
}

export interface EventChange {
  eventId: number;
  title: string;
  startAt: string;
  endAt: string;
  previousStartAt: string;
  previousEndAt: string | null;
}

export interface Suggestion {
  id: string;
  strategy: string;
  label: string;
  reason: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  changes: EventChange[];
}

export interface Analysis {
  engineAvailable: boolean;
  engineMessage: string | null;
  conflicts: Conflict[];
  holidayWarnings: HolidayWarning[];
  deadlineWarning: string | null;
  suggestions: Suggestion[];
  generatedAt: string | null;
}

export interface EventSaveResponse {
  event: ScheduleEvent;
  analysis: Analysis;
}

export interface ApplyScheduleResponse {
  events: ScheduleEvent[];
  analysis: Analysis;
}

export interface DeleteResult {
  id: number;
  detachedChildren: number;
}

export interface Profile {
  displayName: string;
  expectedFinishTime: string;
  expectedFinishAt: string;
  holidayMode: HolidayMode;
  holidayRegion: HolidayRegion;
  idleThresholdSeconds: number;
  demoSeeded: boolean;
}

export interface Holiday {
  date: string;
  name: string;
  kind: "PUBLIC_HOLIDAY" | "WORKDAY";
  region: HolidayRegion;
}

export interface HolidayCalendar {
  year: number;
  region: HolidayRegion;
  available: boolean;
  holidays: Holiday[];
}

export interface DdlInfo {
  event: ScheduleEvent;
  minutesLeft: number;
  withinExpected: boolean;
}

export interface Overview {
  now: string;
  date: string;
  expectedFinishAt: string;
  urgentDdl: DdlInfo | null;
  nextDdl: DdlInfo | null;
  todayCount: number;
  todayMinutes: number;
  activeGoals: number;
  completedToday: number;
  holiday: Holiday | null;
}

export interface Reminder {
  id: string;
  eventId: number | null;
  kind: "START" | "END" | "DDL" | "GOAL_COMPLETE" | string;
  strength: "SOFT" | "STRONG" | string;
  title: string;
  message: string;
  triggerAt: string;
  eventType: EventType;
  startAt: string;
  endAt: string | null;
  dueAt: string | null;
}

export interface HeartbeatResponse {
  active: boolean;
  serverTime: string;
  reminders: Reminder[];
  suppressedStrong: number;
}

export interface WeatherDay {
  date: string;
  code: number;
  condition: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitationProbability: number | null;
  windSpeedMax: number | null;
  rainy: boolean;
  snowy: boolean;
  stormy: boolean;
}

export interface Weather {
  available: boolean;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  days: WeatherDay[];
  message: string | null;
  fetchedAt: string | null;
}

export interface NlpDraft {
  title: string;
  startAt: string;
  endAt: string | null;
  type: EventType;
  priority: Priority;
  location: string | null;
  notes: string;
  confidence: number;
  matches: string[];
}

export interface SystemStatus {
  api: string;
  engineAvailable: boolean;
  engineMessage: string | null;
  serverTime: string;
  calendarYear: number;
}

export interface EventFormValues {
  title: string;
  notes: string;
  type: EventType;
  priority: Priority;
  startAt: string;
  endAt: string | null;
  dueAt: string | null;
  parentId: number | null;
  location: string;
  weatherSensitive: boolean;
  lookaheadDays: number;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
}

export const EVENT_TYPE_META: Record<EventType, { label: string; short: string; description: string }> = {
  NORMAL: {
    label: "普通事件",
    short: "普通",
    description: "独占时间，不与其它普通事件重叠；平时安静，离开时才有强提醒。",
  },
  IMPORTANT: {
    label: "重要事件",
    short: "重要",
    description: "开始和结束都会进行强提醒，适合会议、体检、纪念日。",
  },
  CASUAL: {
    label: "随意事件",
    short: "随意",
    description: "不打扰你，只在时间到达时悄悄变色，作为轻量提示。",
  },
  CONTAINER: {
    label: "容器事件",
    short: "容器",
    description: "可以容纳并行子事件，比如洗衣机运行和午睡同时进行。",
  },
  GOAL: {
    label: "目标事件",
    short: "目标",
    description: "有头无尾，完成后才结束；会自动转为容器，记录实际投入。",
  },
};

export const PRIORITY_META: Record<Priority, { label: string; short: string }> = {
  HIGH: { label: "高优先", short: "高" },
  MEDIUM: { label: "中优先", short: "中" },
  LOW: { label: "低优先", short: "低" },
};
