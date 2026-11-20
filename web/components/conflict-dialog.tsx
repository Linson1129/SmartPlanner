"use client";

import { Button, Dialog, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, Check, Flag, Sparkles, X } from "lucide-react";
import type { Analysis, ScheduleEvent, Suggestion } from "@/lib/types";
import { EVENT_TYPE_META } from "@/lib/types";
import { formatDuration, formatMonthDay, formatTime, parseDateTime } from "@/lib/dates";
import { Spinner } from "./ui";

interface ConflictDialogProps {
  event: ScheduleEvent | null;
  analysis: Analysis | null;
  applying: boolean;
  onClose: () => void;
  onApply: (suggestion: Suggestion) => void;
}

const IMPACT_LABEL: Record<Suggestion["impact"], string> = {
  LOW: "改动轻",
  MEDIUM: "改动适中",
  HIGH: "改动较大",
};

export function ConflictDialog({ event, analysis, applying, onClose, onApply }: ConflictDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(analysis?.suggestions[0]?.id ?? null);
  }, [analysis]);

  if (!event || !analysis) return null;
  const hasConflicts = analysis.conflicts.length > 0;
  const hasHolidayAvoid = analysis.holidayWarnings.some((warning) => warning.mode === "AVOID");
  const title = hasConflicts ? "这段时间撞车了" : hasHolidayAvoid ? "节假日提醒" : "还有一点要提醒你";
  const selectedSuggestion = analysis.suggestions.find((suggestion) => suggestion.id === selected) ?? null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="conflict-title">
      <div className="modal conflict-modal" role="alertdialog" aria-modal="true" style={{ width: "100%", maxWidth: "100%", margin: 0, boxShadow: "none" }}>
        <header className="modal-head">
          <div className="modal-icon alert"><AlertTriangle size={20} /></div>
          <div>
            <p className="panel-kicker">SMART CHECK / 智能检查</p>
            <h2 id="conflict-title">{title}</h2>
          </div>
          <IconButton onClick={onClose} aria-label="关闭" size="small">
            <X size={18} />
          </IconButton>
        </header>

        <div className="modal-body">
          <p className="conflict-intro">
            《{event.title}》已经保存。下面的提醒不会自动改动你的安排，只有你确认后才会重新排期。
          </p>

          {!analysis.engineAvailable ? (
            <div className="conflict-engine-down">
              <AlertTriangle size={16} />
              {analysis.engineMessage ?? "排期引擎暂不可用，日程已保存。"}
            </div>
          ) : null}

          {hasConflicts ? (
            <section className="conflict-section">
              <h3>时间重叠 <span>{analysis.conflicts.length} 处</span></h3>
              <div className="conflict-list">
                {analysis.conflicts.map((conflict) => {
                  const start = parseDateTime(conflict.startAt);
                  const end = parseDateTime(conflict.endAt);
                  return (
                    <div className="conflict-row" key={conflict.eventId}>
                      <span className={`conflict-dot type-${conflict.type.toLowerCase()}`} />
                      <div>
                        <strong>{conflict.title}</strong>
                        <span>{formatMonthDay(start ?? new Date())} {formatTime(start)}–{formatTime(end)} · {EVENT_TYPE_META[conflict.type].short}</span>
                      </div>
                      <em>重叠 {formatDuration(conflict.overlapMinutes)}</em>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {analysis.holidayWarnings.length ? (
            <section className="conflict-section">
              <h3>假期说明</h3>
              <div className="holiday-warning-list">
                {analysis.holidayWarnings.map((warning) => (
                  <div className="holiday-warning" key={`${warning.date}-${warning.name}`}>
                    <Flag size={14} />
                    <p>{warning.message}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {analysis.deadlineWarning ? (
            <div className="deadline-warning">
              <CalendarClock size={16} />
              <p>{analysis.deadlineWarning}</p>
            </div>
          ) : null}

          {analysis.suggestions.length ? (
            <section className="conflict-section">
              <h3><Sparkles size={15} /> 可以这样调整</h3>
              <p className="suggestion-hint">选择一个方案，系统只会改动下面列出的安排。</p>
              <div className="suggestion-list">
                {analysis.suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.id}
                    className={`suggestion-card ${selected === suggestion.id ? "selected" : ""}`}
                    onClick={() => setSelected(suggestion.id)}
                  >
                    <span className="suggestion-radio"><i /></span>
                    <span className="suggestion-copy">
                      <span className="suggestion-topline">
                        <strong>{suggestion.label}</strong>
                        <em className={`impact-${suggestion.impact.toLowerCase()}`}>{IMPACT_LABEL[suggestion.impact]}</em>
                      </span>
                      <span className="suggestion-reason">{suggestion.reason}</span>
                      <span className="suggestion-changes">
                        {suggestion.changes.map((change) => (
                          <span className="suggestion-change" key={change.eventId}>
                            <span>{change.title}</span>
                            <ArrowRight size={10} />
                            <span>{formatMonthDay(parseDateTime(change.startAt) ?? new Date())} {formatTime(parseDateTime(change.startAt))}–{formatTime(parseDateTime(change.endAt))}</span>
                            <DeltaLabel change={change} />
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="no-suggestion">
              <p>暂时没有可以自动套用的方案。你可以保留现有安排，或手动拖动/编辑事件。</p>
            </div>
          )}
        </div>

        <footer className="modal-foot">
          <Button variant="outlined" onClick={onClose}>
            {hasConflicts ? "先保留当前安排" : "知道了"}
          </Button>
          {analysis.suggestions.length ? (
            <Button
              variant="contained"
              disabled={!selectedSuggestion || applying}
              onClick={() => selectedSuggestion && onApply(selectedSuggestion)}
              startIcon={applying ? <Spinner size={15} /> : <Check size={16} />}
            >
              {applying ? "正在调整…" : "应用这个方案"}
            </Button>
          ) : null}
        </footer>
      </div>
    </Dialog>
  );
}

function DeltaLabel({ change }: { change: Suggestion["changes"][number] }) {
  const previous = parseDateTime(change.previousStartAt);
  const next = parseDateTime(change.startAt);
  if (!previous || !next) return null;
  const diff = Math.round((next.getTime() - previous.getTime()) / 60000);
  if (diff === 0) return <em className="delta same">时间不变</em>;
  return (
    <em className={`delta ${diff > 0 ? "later" : "earlier"}`}>
      {diff > 0 ? "后移 " : "提前 "}
      {formatShift(Math.abs(diff))}
    </em>
  );
}

function formatShift(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours ? `${days} 天 ${hours} 小时` : `${days} 天`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
  }
  return `${minutes} 分`;
}
