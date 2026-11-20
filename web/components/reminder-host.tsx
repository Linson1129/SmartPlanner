"use client";

import { useEffect, useRef } from "react";
import { BellRing, Clock, Target } from "lucide-react";
import type { Reminder } from "@/lib/types";
import { EVENT_TYPE_META } from "@/lib/types";
import { formatMonthDay, formatTime, parseDateTime } from "@/lib/dates";

interface ReminderHostProps {
  queue: Reminder[];
  onDismiss: (id: string) => void;
  onSnooze: (reminder: Reminder) => void;
}

const KIND_LABEL: Record<string, string> = {
  START: "开始提醒",
  END: "结束提醒",
  DDL: "截止提醒",
  GOAL_COMPLETE: "目标达成",
};

export function ReminderHost({ queue, onDismiss, onSnooze }: ReminderHostProps) {
  const current = queue[0] ?? null;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => buttonRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [current?.id]);

  if (!current) return null;
  const start = parseDateTime(current.startAt);
  const end = parseDateTime(current.endAt);
  const due = parseDateTime(current.dueAt);
  const trigger = parseDateTime(current.triggerAt);
  const kind = KIND_LABEL[current.kind] ?? "提醒";
  const type = current.kind === "GOAL_COMPLETE" ? "GOAL" : current.eventType;
  const moment = current.kind === "GOAL_COMPLETE"
    ? trigger
    : current.kind === "DDL"
      ? due
      : current.kind === "END"
        ? end
        : start;
  const momentLabel = current.kind === "GOAL_COMPLETE"
    ? "达成"
    : current.kind === "DDL"
      ? "截止"
      : current.kind === "END"
        ? "结束"
        : "开始";

  return (
    <div className="reminder-layer" role="alertdialog" aria-modal="true" aria-labelledby="reminder-title">
      <div className="reminder-backdrop" />
      <div className={`reminder-modal type-${type.toLowerCase()}`}>
        <div className="reminder-beacon">
          <span className="beacon-ring" />
          <span className="beacon-core"><BellRing size={25} /></span>
        </div>
        <p className="reminder-kicker">STRONG REMINDER / 强提醒</p>
        <span className="reminder-kind">
          {type === "GOAL" ? <Target size={13} /> : <Clock size={13} />}
          {kind}
          <i>·</i>
          {EVENT_TYPE_META[type].label}
        </span>
        <h2 id="reminder-title">{current.title}</h2>
        <p className="reminder-message">{current.message}</p>

        <div className="reminder-time">
          {moment ? (
            <>
              <span>{formatMonthDay(moment)}</span>
              <strong>{formatTime(moment)}</strong>
              <em>{momentLabel}</em>
            </>
          ) : null}
        </div>

        {queue.length > 1 ? <p className="reminder-queue">还有 {queue.length - 1} 条提醒排队中</p> : null}

        <div className="reminder-actions">
          <button type="button" className="ghost-button" onClick={() => onSnooze(current)}>
            5 分钟后再提醒
          </button>
          <button ref={buttonRef} type="button" className="primary-button" onClick={() => onDismiss(current.id)}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
