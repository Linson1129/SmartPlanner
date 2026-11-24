"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Box, Button, Drawer, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { format } from "date-fns";
import {
  CalendarClock,
  CloudSun,
  Check,
  CheckCircle2,
  Flag,
  Layers,
  Link2,
  MapPin,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type {
  Analysis,
  EventFormValues,
  EventType,
  Priority,
  ScheduleEvent,
} from "@/lib/types";
import { EVENT_TYPE_META, PRIORITY_META } from "@/lib/types";
import {
  combineDateAndTime,
  formatDuration,
  formatLongDate,
  formatMonthDay,
  formatTime,
  parseDateTime,
  toApiDateTime,
} from "@/lib/dates";
import { ApiRequestError, completeEvent, createEvent, deleteEvent, updateEvent } from "@/lib/api";
import { EventGlyph, Spinner, TypeBadge } from "./ui";

export interface CreatePrefill {
  start: Date;
  end?: Date;
  title?: string;
  notes?: string;
  location?: string;
  priority?: Priority;
  type?: EventType;
  parentId?: number | null;
  weatherSensitive?: boolean;
  lookaheadDays?: number;
}

export type PanelState =
  | { mode: "create"; prefill: CreatePrefill; key: string }
  | { mode: "view"; event: ScheduleEvent; key: string }
  | { mode: "edit"; event: ScheduleEvent; key: string };

interface EventPanelProps {
  panel: PanelState;
  events: ScheduleEvent[];
  onClose: () => void;
  onSaved: (event: ScheduleEvent, analysis: Analysis) => void;
  onCompleted: (event: ScheduleEvent) => void;
  onDeleted: (id: number, detachedChildren: number) => void;
  onOpenEvent: (event: ScheduleEvent) => void;
  onAddChild: (container: ScheduleEvent, prefill: CreatePrefill) => void;
}

interface FormState {
  title: string;
  notes: string;
  type: EventType;
  priority: Priority;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  dueEnabled: boolean;
  dueDate: string;
  dueTime: string;
  parentId: string;
  location: string;
  weatherSensitive: boolean;
  lookaheadDays: number;
}

const TYPE_ORDER: EventType[] = ["NORMAL", "IMPORTANT", "CASUAL", "CONTAINER", "GOAL"];
const PRIORITY_ORDER: Priority[] = ["HIGH", "MEDIUM", "LOW"];

export function EventPanel({
  panel,
  events,
  onClose,
  onSaved,
  onCompleted,
  onDeleted,
  onOpenEvent,
  onAddChild,
}: EventPanelProps) {
  const isCreate = panel.mode === "create";
  const event = panel.mode === "create" ? null : panel.event;
  const [editing, setEditing] = useState(isCreate || panel.mode === "edit");
  const [form, setForm] = useState<FormState>(() => buildInitialForm(panel));
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => new Date());
  const titleRef = useRef<HTMLInputElement>(null);
  const isGoalEditing = form.type === "GOAL";

  useEffect(() => {
    setEditing(panel.mode === "create" || panel.mode === "edit");
    setForm(buildInitialForm(panel));
    setFormError(null);
    setFieldErrors({});
    setConfirmDelete(false);
    setSaving(false);
    setCompleting(false);
    setDeleting(false);
  }, [panel.key, panel.mode]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (editing) {
      const timer = setTimeout(() => titleRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [editing]);

  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape" && !saving && !deleting) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving, deleting]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const children = useMemo(() => {
    if (!event) return [];
    return events.filter((item) => item.parentId === event.id).sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [event, events]);

  const parentEvent = useMemo(() => {
    if (!event?.parentId) return null;
    return events.find((item) => item.id === event.parentId) ?? null;
  }, [event, events]);

  const containers = useMemo(() => events.filter((item) =>
    item.type === "CONTAINER"
    && item.status !== "CANCELLED"
    && item.id !== event?.id
  ), [event?.id, events]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleTypeChange = (type: EventType) => {
    if (event?.goalCompleted && type !== "CONTAINER") return;
    setForm((current) => ({
      ...current,
      type,
      parentId: type === "GOAL" || type === "CONTAINER" ? "" : current.parentId,
    }));
  };

  const handleStartDateChange = (value: string) => {
    setForm((current) => {
      const next = { ...current, startDate: value };
      if (!current.endDate || current.endDate < value) {
        next.endDate = value;
      }
      if (!current.dueDate || current.dueDate < value) {
        next.dueDate = value;
      }
      return next;
    });
  };

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const title = form.title.trim();
    if (!title) {
      setFormError("给这段时间起个名字吧");
      return;
    }
    const start = combineDateAndTime(parseDateInput(form.startDate), form.startTime);
    const end = combineDateAndTime(parseDateInput(form.endDate), form.endTime);
    if (form.type !== "GOAL" && end <= start) {
      setFormError("结束时间需要晚于开始时间");
      return;
    }
    const due = form.dueEnabled
      ? combineDateAndTime(parseDateInput(form.dueDate), form.dueTime)
      : null;
    const values: EventFormValues = {
      title,
      notes: form.notes.trim(),
      type: form.type,
      priority: form.priority,
      startAt: toApiDateTime(start),
      endAt: form.type === "GOAL" ? null : toApiDateTime(end),
      dueAt: due ? toApiDateTime(due) : null,
      parentId: form.parentId ? Number(form.parentId) : null,
      location: form.location.trim(),
      weatherSensitive: form.weatherSensitive,
      lookaheadDays: form.weatherSensitive ? form.lookaheadDays : 0,
    };
    setSaving(true);
    try {
      const response = event
        ? await updateEvent(event.id, values)
        : await createEvent(values);
      onSaved(response.event, response.analysis);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFormError(error.message);
        setFieldErrors(error.fields ?? {});
      } else {
        setFormError("保存失败了，请检查网络后重试");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!event) return;
    setCompleting(true);
    try {
      const updated = await completeEvent(event.id);
      onCompleted(updated);
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "暂时无法完成，请重试");
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteEvent(event.id);
      onDeleted(result.id, result.detachedChildren);
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "删除失败了，请重试");
    } finally {
      setDeleting(false);
    }
  };

  const startForChild = (): CreatePrefill => {
    if (!event) {
      return { start: new Date() };
    }
    const containerStart = parseDateTime(event.startAt) ?? new Date();
    const start = new Date(Math.max(containerStart.getTime(), Date.now()));
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    return {
      start,
      parentId: event.id,
      type: "NORMAL",
      priority: "LOW",
    };
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 470 }, backgroundImage: "none" } } }}
    >
      <aside className="event-panel mui-event-panel" role="dialog" aria-modal="true" aria-label={isCreate ? "新建事件" : "日程详情"}>
        <header className="panel-head">
          <div>
            <p className="panel-kicker">{isCreate ? "NEW ENTRY" : editing ? "EDIT ENTRY" : "SCHEDULE DETAIL"}</p>
            <h2>{isCreate ? "新建事件" : editing ? "修改这项安排" : "这项安排"}</h2>
          </div>
          <IconButton onClick={onClose} aria-label="关闭" size="small">
            <X size={18} />
          </IconButton>
        </header>

        <div className="panel-body">
          {editing ? (
            <form className="event-form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  inputRef={titleRef}
                  id="event-title"
                  label="事件名称"
                  value={form.title}
                  onChange={(changeEvent) => setField("title", changeEvent.target.value)}
                  placeholder="比如：和队友过一遍需求分析"
                  fullWidth
                  required
                  error={!!fieldErrors.title}
                  helperText={fieldErrors.title}
                  autoComplete="off"
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />

                <TextField
                  select
                  fullWidth
                  label="事件类型"
                  value={form.type}
                  onChange={(changeEvent) => handleTypeChange(changeEvent.target.value as EventType)}
                  helperText={reminderNote(form.type)}
                  disabled={!!event?.goalCompleted}
                >
                  {TYPE_ORDER.map((type) => (
                    <MenuItem key={type} value={type} disabled={!!event?.goalCompleted && type !== "CONTAINER"}>
                      {EVENT_TYPE_META[type].label}
                    </MenuItem>
                  ))}
                </TextField>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>时间</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
                    <TextField
                      id="start-date"
                      type="date"
                      label="开始日期"
                      value={form.startDate}
                      onChange={(changeEvent) => handleStartDateChange(changeEvent.target.value)}
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      id="start-time"
                      type="time"
                      label="开始时间"
                      value={form.startTime}
                      onChange={(changeEvent) => setField("startTime", changeEvent.target.value)}
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    {form.type !== "GOAL" ? (
                      <>
                        <TextField
                          id="end-date"
                          type="date"
                          label="结束日期"
                          value={form.endDate}
                          onChange={(changeEvent) => setField("endDate", changeEvent.target.value)}
                          required
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                          id="end-time"
                          type="time"
                          label="结束时间"
                          value={form.endTime}
                          onChange={(changeEvent) => setField("endTime", changeEvent.target.value)}
                          required
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </>
                    ) : null}
                  </Box>
                  {isGoalEditing ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                      <Target size={13} /> 目标没有结束时间，完成时会自动截止并转为容器。
                    </Typography>
                  ) : null}
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>优先级</Typography>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    value={form.priority}
                    onChange={(_, value: Priority | null) => { if (value) setField("priority", value); }}
                    size="small"
                  >
                    {PRIORITY_ORDER.map((priority) => (
                      <ToggleButton key={priority} value={priority} sx={{ py: 0.8 }}>
                        {PRIORITY_META[priority].label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                <Box>
                  <FormControlLabel
                    control={<Switch checked={form.dueEnabled} onChange={() => setField("dueEnabled", !form.dueEnabled)} />}
                    label="截止时间 DDL"
                  />
                  {form.dueEnabled ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mt: 0.5 }}>
                      <TextField
                        id="due-date"
                        type="date"
                        label="截止日期"
                        value={form.dueDate}
                        onChange={(changeEvent) => setField("dueDate", changeEvent.target.value)}
                        required
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        id="due-time"
                        type="time"
                        label="截止时间"
                        value={form.dueTime}
                        onChange={(changeEvent) => setField("dueTime", changeEvent.target.value)}
                        required
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">设置后会进入侧栏 DDL 加急框，并与预期收工时间比较。</Typography>
                </Box>

                {form.type !== "GOAL" && form.type !== "CONTAINER" ? (
                  <TextField
                    select
                    fullWidth
                    label="放进容器（可选）"
                    value={form.parentId}
                    onChange={(changeEvent) => setField("parentId", changeEvent.target.value)}
                    helperText="放进容器后，可以与容器内的其它事件并行。"
                  >
                    <MenuItem value="">独立事件</MenuItem>
                    {containers.map((container) => (
                      <MenuItem key={container.id} value={container.id}>
                        {container.title} · {formatTime(parseDateTime(container.startAt))}–{formatTime(parseDateTime(container.endAt))}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}

                <TextField
                  id="event-location"
                  label="地点"
                  value={form.location}
                  onChange={(changeEvent) => setField("location", changeEvent.target.value)}
                  placeholder="图书馆 / 线上 / 氹仔"
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />

                <Box>
                  <FormControlLabel
                    control={<Switch checked={form.weatherSensitive} onChange={() => setField("weatherSensitive", !form.weatherSensitive)} />}
                    label="天气敏感 · 预见性"
                  />
                  {form.weatherSensitive ? (
                    <TextField
                      select
                      fullWidth
                      value={form.lookaheadDays}
                      onChange={(changeEvent) => setField("lookaheadDays", Number(changeEvent.target.value))}
                      size="small"
                    >
                      <MenuItem value={1}>提前 1 天关注天气</MenuItem>
                      <MenuItem value={3}>提前 3 天关注天气</MenuItem>
                      <MenuItem value={7}>提前 7 天关注天气</MenuItem>
                    </TextField>
                  ) : null}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <CloudSun size={13} /> 天气有雨时会给出提醒，适合户外、通勤和旅行。
                  </Typography>
                </Box>

                <TextField
                  id="event-notes"
                  label="备注"
                  value={form.notes}
                  onChange={(changeEvent) => setField("notes", changeEvent.target.value)}
                  placeholder="写下这件事的上下文。"
                  multiline
                  minRows={3}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />

                {formError ? <Typography color="error" variant="body2">{formError}</Typography> : null}

                <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                  <Button type="button" variant="outlined" onClick={() => {
                    if (event) {
                      setEditing(false);
                      setForm(buildInitialForm(panel));
                    } else {
                      onClose();
                    }
                  }} disabled={saving}>
                    取消
                  </Button>
                  <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <Spinner size={15} /> : <Check size={16} />}>
                    {saving ? "保存中…" : "保存安排"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          ) : event ? (
            <EventDetails
              event={event}
              parentEvent={parentEvent}
              children={children}
              now={now}
              onEdit={() => setEditing(true)}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onAddChild={() => onAddChild(event, startForChild())}
              completing={completing}
              deleting={deleting}
              confirmDelete={confirmDelete}
              onOpenEvent={onOpenEvent}
            />
          ) : null}
          {!editing && formError ? <div className="form-error panel-error">{formError}</div> : null}
        </div>
      </aside>
    </Drawer>
  );
}

function EventDetails({
  event,
  parentEvent,
  children,
  now,
  onEdit,
  onComplete,
  onDelete,
  onAddChild,
  onOpenEvent,
  completing,
  deleting,
  confirmDelete,
}: {
  event: ScheduleEvent;
  parentEvent: ScheduleEvent | null;
  children: ScheduleEvent[];
  now: Date;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onOpenEvent: (event: ScheduleEvent) => void;
  completing: boolean;
  deleting: boolean;
  confirmDelete: boolean;
}) {
  const start = parseDateTime(event.startAt);
  const end = parseDateTime(event.endAt);
  const due = parseDateTime(event.dueAt);
  const openGoal = event.type === "GOAL" && !event.endAt;
  const displayType = event.goalCompleted ? "GOAL" : event.type;
  const elapsedMinutes = openGoal && start ? Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000)) : 0;
  const actualMinutes = event.goalCompleted && start && event.completedAt
    ? Math.max(0, Math.round((new Date(event.completedAt).getTime() - start.getTime()) / 60000))
    : null;
  const duration = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : null;

  return (
    <div className="event-details">
      <div className="detail-badges">
        <TypeBadge type={displayType} />
        <span className={`detail-priority priority-${event.priority.toLowerCase()}`}>{PRIORITY_META[event.priority].label}</span>
        {event.status === "DONE" ? <span className="detail-status"><CheckCircle2 size={12} /> 已完成</span> : null}
        {openGoal ? <span className="detail-status live"><Play size={11} /> 进行中</span> : null}
        {event.goalCompleted ? <span className="detail-status"><Target size={12} /> 目标已完成</span> : null}
      </div>

      <h3 className="detail-title">{event.title}</h3>

      <div className="detail-time-card">
        <div className="detail-time-icon"><CalendarClock size={18} /></div>
        <div>
          {openGoal ? (
            <>
              <strong>{start ? formatLongDate(start) : ""} {formatTime(start)} 开始</strong>
              <span>没有结束时间 · 已投入 {formatDuration(elapsedMinutes)}</span>
            </>
          ) : (
            <>
              <strong>
                {start ? formatMonthDay(start) : ""} {formatTime(start)}
                <span className="time-dash">—</span>
                {end && start && end.toDateString() === start.toDateString() ? "" : end ? formatMonthDay(end) : ""} {formatTime(end)}
              </strong>
              <span>{duration !== null ? `共 ${formatDuration(duration)}` : "时间待补充"}</span>
            </>
          )}
        </div>
      </div>

      {actualMinutes !== null ? (
        <div className="goal-actual">
          <Target size={17} />
          <div>
            <strong>这段目标实际投入了 {formatDuration(actualMinutes)}</strong>
            <span>完成后已自动转为容器，后续可以继续往里放事件。</span>
          </div>
        </div>
      ) : null}

      <dl className="detail-list">
        {due ? (
          <div>
            <dt><Flag size={14} /> 截止</dt>
            <dd>{formatLongDate(due)} {formatTime(due)}</dd>
          </div>
        ) : null}
        {event.location ? (
          <div>
            <dt><MapPin size={14} /> 地点</dt>
            <dd>{event.location}</dd>
          </div>
        ) : null}
        {event.weatherSensitive ? (
          <div>
            <dt><CloudSun size={14} /> 天气敏感</dt>
            <dd>提前 {event.lookaheadDays || 1} 天关注天气影响</dd>
          </div>
        ) : null}
        {parentEvent ? (
          <div>
            <dt><Link2 size={14} /> 容器</dt>
            <dd>
              <button type="button" className="link-button" onClick={() => onOpenEvent(parentEvent)}>
                {parentEvent.title}
              </button>
            </dd>
          </div>
        ) : null}
        {event.type === "CONTAINER" ? (
          <div>
            <dt><Layers size={14} /> 并行空间</dt>
            <dd>{children.length ? `${children.length} 个子事件可以在这里同时进行` : "还没有子事件，可以放入洗衣、午睡这类并行安排。"}</dd>
          </div>
        ) : null}
        {event.completedAt ? (
          <div>
            <dt><CheckCircle2 size={14} /> 完成于</dt>
            <dd>{formatLongDate(new Date(event.completedAt))} {formatTime(new Date(event.completedAt))}</dd>
          </div>
        ) : null}
      </dl>

      {event.notes ? <div className="detail-notes"><span>备注</span><p>{event.notes}</p></div> : null}

      {children.length ? (
        <div className="child-section">
          <div className="child-section-head">
            <span>容器里的并行事件</span>
            <small>{children.length} 项</small>
          </div>
          <div className="child-list">
            {children.map((child) => (
              <button type="button" key={child.id} className="child-row" onClick={() => onOpenEvent(child)}>
                <span className="child-time">{formatTime(parseDateTime(child.startAt))}</span>
                <span className="child-title"><EventGlyph type={child.type} size={11} />{child.title}</span>
                <span className="child-duration">{durationLabel(child)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {event.type === "CONTAINER" ? (
        <button type="button" className="add-child-button" onClick={onAddChild}>
          <Plus size={15} /> 添加并行子事件
        </button>
      ) : null}

      <div className="detail-actions">
        {event.status !== "DONE" && event.status !== "CANCELLED" ? (
          <button type="button" className="primary-button" onClick={onComplete} disabled={completing}>
            {completing ? <Spinner size={15} /> : <CheckCircle2 size={16} />}
            {event.type === "GOAL" ? "完成目标" : "标记完成"}
          </button>
        ) : null}
        <button type="button" className="ghost-button" onClick={onEdit}>
          <Pencil size={15} /> 编辑
        </button>
        <button type="button" className={`ghost-button danger ${confirmDelete ? "confirm" : ""}`} onClick={onDelete} disabled={deleting}>
          {deleting ? <Spinner size={15} /> : <Trash2 size={15} />}
          {confirmDelete ? "确认删除" : "删除"}
        </button>
      </div>

    </div>
  );
}

function durationLabel(event: ScheduleEvent): string {
  const start = parseDateTime(event.startAt);
  const end = parseDateTime(event.endAt);
  if (!start || !end) return "";
  return formatDuration(Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)));
}

function reminderNote(type: EventType): string {
  switch (type) {
    case "IMPORTANT":
      return "开始和结束都会强提醒，适合会议、体检和重要约定。";
    case "CASUAL":
      return "不打扰：到点只在时间轴里改变颜色，没有弹窗。";
    case "CONTAINER":
      return "容器可以容纳并行事件；开始时提醒一次，结束时强制提醒。";
    case "GOAL":
      return "有头无尾：完成后自动转成容器，记录你真正投入的时间。";
    default:
      return "独占时间；活跃时只给轻提示，离开后才发强提醒。";
  }
}

function buildInitialForm(panel: PanelState): FormState {
  if (panel.mode === "create") {
    const start = roundToFive(panel.prefill.start);
    const end = panel.prefill.end ? new Date(panel.prefill.end) : new Date(start.getTime() + 60 * 60 * 1000);
    return {
      title: panel.prefill.title ?? "",
      notes: panel.prefill.notes ?? "",
      type: panel.prefill.type ?? "NORMAL",
      priority: panel.prefill.priority ?? "MEDIUM",
      startDate: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      endDate: format(end, "yyyy-MM-dd"),
      endTime: format(end, "HH:mm"),
      dueEnabled: false,
      dueDate: format(end, "yyyy-MM-dd"),
      dueTime: format(end, "HH:mm"),
      parentId: panel.prefill.parentId ? String(panel.prefill.parentId) : "",
      location: panel.prefill.location ?? "",
      weatherSensitive: panel.prefill.weatherSensitive ?? false,
      lookaheadDays: panel.prefill.lookaheadDays ?? 1,
    };
  }
  const event = panel.event;
  const start = parseDateTime(event.startAt) ?? new Date();
  const end = parseDateTime(event.endAt) ?? new Date(start.getTime() + 60 * 60 * 1000);
  const due = parseDateTime(event.dueAt);
  return {
    title: event.title,
    notes: event.notes ?? "",
    type: event.type,
    priority: event.priority,
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    dueEnabled: !!due,
    dueDate: format(due ?? end, "yyyy-MM-dd"),
    dueTime: format(due ?? end, "HH:mm"),
    parentId: event.parentId ? String(event.parentId) : "",
    location: event.location ?? "",
    weatherSensitive: event.weatherSensitive,
    lookaheadDays: event.lookaheadDays > 0 ? event.lookaheadDays : 1,
  };
}

function roundToFive(date: Date): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);
  result.setMinutes(Math.ceil(result.getMinutes() / 5) * 5);
  return result;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
