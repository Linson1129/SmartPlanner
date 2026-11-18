import type {
  Analysis,
  ApplyScheduleResponse,
  DeleteResult,
  EventFormValues,
  EventSaveResponse,
  HeartbeatResponse,
  HolidayCalendar,
  Overview,
  Profile,
  Reminder,
  NlpDraft,
  ScheduleEvent,
  SystemStatus,
  Weather,
} from "./types";

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    let payload: { message?: string; code?: string; fields?: Record<string, string> } = {};
    try {
      payload = await response.json();
    } catch {
      // Keep a generic message when the server did not return JSON.
    }
    throw new ApiRequestError(
      response.status,
      payload.message ?? `请求失败（${response.status}）`,
      payload.code,
      payload.fields,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function fetchEvents(from: string, to: string): Promise<ScheduleEvent[]> {
  return request<ScheduleEvent[]>(`/api/events${query({ from, to })}`);
}

export function fetchOverview(date: string): Promise<Overview> {
  return request<Overview>(`/api/overview${query({ date })}`);
}

export function fetchProfile(): Promise<Profile> {
  return request<Profile>("/api/profile");
}

export function updateProfile(payload: {
  displayName: string;
  expectedFinishTime: string;
  holidayMode: string;
  holidayRegion: string;
  idleThresholdSeconds: number;
}): Promise<Profile> {
  return request<Profile>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchHolidays(year: number): Promise<HolidayCalendar> {
  return request<HolidayCalendar>(`/api/holidays${query({ year })}`);
}

export function createEvent(values: EventFormValues): Promise<EventSaveResponse> {
  return request<EventSaveResponse>("/api/events", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateEvent(id: number, values: EventFormValues): Promise<EventSaveResponse> {
  return request<EventSaveResponse>(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function deleteEvent(id: number): Promise<DeleteResult> {
  return request<DeleteResult>(`/api/events/${id}`, { method: "DELETE" });
}

export function completeEvent(id: number): Promise<ScheduleEvent> {
  return request<ScheduleEvent>(`/api/events/${id}/complete`, { method: "PATCH" });
}

export function moveEvent(
  id: number,
  startAt: string,
  endAt: string,
): Promise<EventSaveResponse> {
  return request<EventSaveResponse>(`/api/events/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ startAt, endAt }),
  });
}

export function fetchWeather(from: string, to: string): Promise<Weather> {
  return request<Weather>(`/api/weather${query({ from, to })}`);
}

export function parseSentence(text: string): Promise<NlpDraft> {
  return request<NlpDraft>("/api/nlp/parse", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function applySchedule(
  changes: Array<{ eventId: number; startAt: string; endAt: string }>,
  anchorEventId: number,
): Promise<ApplyScheduleResponse> {
  return request<ApplyScheduleResponse>("/api/schedule/apply", {
    method: "POST",
    body: JSON.stringify({ changes, anchorEventId }),
  });
}

export function sendHeartbeat(
  sessionId: string,
  active: boolean,
  visible: boolean,
): Promise<HeartbeatResponse> {
  return request<HeartbeatResponse>("/api/presence/heartbeat", {
    method: "POST",
    body: JSON.stringify({ sessionId, active, visible }),
  });
}

export function fetchSystemStatus(): Promise<SystemStatus> {
  return request<SystemStatus>("/api/system/status");
}

export function isEngineIssue(analysis: Analysis | null | undefined): boolean {
  return !!analysis && !analysis.engineAvailable;
}
