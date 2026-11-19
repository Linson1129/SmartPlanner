"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Holiday } from "@/lib/types";
import { getMonthWeeks, WEEKDAY_LABELS, dateKey } from "@/lib/dates";

interface MiniCalendarProps {
  selectedDate: Date;
  holidays: Holiday[];
  onSelectDate: (date: Date) => void;
}

export function MiniCalendar({ selectedDate, holidays, onSelectDate }: MiniCalendarProps) {
  const [displayedMonth, setDisplayedMonth] = useState(() => startOfMonth(selectedDate));
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    setDisplayedMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const weeks = useMemo(() => getMonthWeeks(displayedMonth), [displayedMonth]);
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidays) {
      if (holiday.kind === "PUBLIC_HOLIDAY") map.set(holiday.date, holiday);
    }
    return map;
  }, [holidays]);

  return (
    <div className="mini-calendar">
      <div className="mini-head">
        <span>{format(displayedMonth, "yyyy年 M月", { locale: zhCN })}</span>
        <div className="mini-nav">
          <button type="button" onClick={() => setDisplayedMonth((month) => addMonths(month, -1))} aria-label="上个月">
            <ChevronLeft size={14} />
          </button>
          <button type="button" onClick={() => setDisplayedMonth((month) => addMonths(month, 1))} aria-label="下个月">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="mini-weekdays">
        {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="mini-weeks">
        {weeks.map((week) => (
          <div className="mini-week" key={week[0].toISOString()}>
            {week.map((day) => {
              const holiday = holidayMap.get(dateKey(day));
              const outside = !isSameMonth(day, displayedMonth);
              const selected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={[
                    "mini-day",
                    outside ? "outside" : "",
                    selected ? "selected" : "",
                    isToday ? "today" : "",
                    holiday ? "holiday" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => onSelectDate(day)}
                  aria-label={format(day, "yyyy年M月d日", { locale: zhCN })}
                  title={holiday?.name}
                >
                  {format(day, "d")}
                  {holiday ? <i className="mini-dot" /> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mini-footnote"><i className="mini-dot" /> 公众假期</p>
    </div>
  );
}
