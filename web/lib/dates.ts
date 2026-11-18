import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ViewMode } from "./types";

export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
export const WEEK_STARTS_ON = 1 as const;

export function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseISO(value);
}

export function toApiDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

export function toApiDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function startOfToday(): Date {
  return startOfDay(new Date());
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function formatTime(date: Date | null): string {
  if (!date) return "";
  return format(date, "HH:mm");
}

export function formatDayNumber(date: Date): string {
  return format(date, "dd");
}

export function formatMonthDay(date: Date): string {
  return format(date, "M月d日", { locale: zhCN });
}

export function formatMonthTitle(date: Date): string {
  return format(date, "yyyy年M月", { locale: zhCN });
}

export function formatDateTitle(date: Date): string {
  return format(date, "M月d日，EEEE", { locale: zhCN });
}

export function formatLongDate(date: Date): string {
  return format(date, "yyyy年M月d日 EE", { locale: zhCN });
}

export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  const end = addDays(start, 6);
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "yyyy年M月d日")} — ${format(end, "yyyy年M月d日")}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "M月d日")} — ${format(end, "M月d日")}`;
  }
  return `${format(start, "M月d日")} — ${format(end, "d日")}`;
}

export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} 分钟`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分`;
}

export function formatClockDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分钟`;
}

export function formatCountdown(minutes: number): string {
  if (minutes < 0) return "已超时";
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `${days} 天 ${hours % 24} 小时`;
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 6) return "夜深了";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function weekdayLabel(date: Date): string {
  return `周${WEEKDAY_LABELS[(date.getDay() + 6) % 7]}`;
}

export function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthWeeks(date: Date): Date[][] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function getViewRange(date: Date, view: ViewMode): { from: Date; to: Date } {
  if (view === "day") {
    const from = startOfDay(date);
    return { from, to: addDays(from, 1) };
  }
  if (view === "week") {
    const from = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
    return { from, to: addDays(from, 7) };
  }
  const weeks = getMonthWeeks(date);
  return { from: weeks[0][0], to: addDays(weeks[weeks.length - 1][6], 1) };
}

export function shiftDate(date: Date, view: ViewMode, amount: number): Date {
  if (view === "day") return addDays(date, amount);
  if (view === "week") return addDays(date, amount * 7);
  return addMonths(date, amount);
}

export function rangeTitle(date: Date, view: ViewMode): string {
  if (view === "day") return formatDateTitle(date);
  if (view === "week") return formatWeekRange(date);
  return formatMonthTitle(date);
}

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && isSameDay(a, b);
}

export function daysBetween(a: Date, b: Date): number {
  return differenceInCalendarDays(b, a);
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

export { addDays, startOfDay, endOfMonth, startOfMonth, startOfWeek, endOfWeek, format, parseISO, isSameDay };
