"use client";

import { Button, Dialog, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { Check, Clock3, Flag, Landmark, Settings2, X } from "lucide-react";
import type { HolidayMode, HolidayRegion, Profile, SystemStatus } from "@/lib/types";
import { fetchSystemStatus, updateProfile, ApiRequestError } from "@/lib/api";
import { Spinner } from "./ui";

interface SettingsDialogProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
}

const HOLIDAY_MODES: Array<{ value: HolidayMode; label: string }> = [
  { value: "OFF", label: "不提醒" },
  { value: "SOFT", label: "仅提醒" },
  { value: "AVOID", label: "提醒并建议避开" },
];

export function SettingsDialog({ open, profile, onClose, onSaved }: SettingsDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [expectedFinishTime, setExpectedFinishTime] = useState("22:00");
  const [holidayMode, setHolidayMode] = useState<HolidayMode>("SOFT");
  const [holidayRegion, setHolidayRegion] = useState<HolidayRegion>("MO");
  const [idleThreshold, setIdleThreshold] = useState(90);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setDisplayName(profile.displayName);
    setExpectedFinishTime(profile.expectedFinishTime);
    setHolidayMode(profile.holidayMode);
    setHolidayRegion(profile.holidayRegion);
    setIdleThreshold(profile.idleThresholdSeconds);
    setError(null);
    setSaving(false);
    setStatus(null);
    setStatusError(false);
    fetchSystemStatus().then(setStatus).catch(() => setStatusError(true));
  }, [open, profile]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  if (!open || !profile) return null;

  const save = async () => {
    if (!displayName.trim()) {
      setError("请留一个称呼");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        displayName: displayName.trim(),
        expectedFinishTime,
        holidayMode,
        holidayRegion,
        idleThresholdSeconds: idleThreshold,
      });
      onSaved(updated);
    } catch (saveError) {
      setError(saveError instanceof ApiRequestError ? saveError.message : "保存设置失败了");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="settings-title">
      <div className="modal settings-modal" role="dialog" aria-modal="true">
        <header className="modal-head">
          <div className="modal-icon settings"><Settings2 size={20} /></div>
          <div>
            <p className="panel-kicker">PREFERENCES / 设置</p>
            <h2 id="settings-title">你的节奏，你说了算</h2>
          </div>
          <IconButton onClick={onClose} aria-label="关闭" size="small">
            <X size={18} />
          </IconButton>
        </header>

        <div className="modal-body settings-body">
          <section className="settings-section">
            <div className="settings-section-head">
              <Clock3 size={16} />
              <div>
                <h3>时间与节奏</h3>
              </div>
            </div>
            <div className="settings-grid">
              <label className="settings-field">
                <span>怎么称呼你</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} />
              </label>
              <div className="settings-field">
                <span>今日预期收工</span>
                <div className="time-setting">
                  <input type="time" value={expectedFinishTime} onChange={(event) => setExpectedFinishTime(event.target.value)} step={300} />
                  <div className="quick-times">
                    {["21:00", "22:00", "23:00"].map((time) => (
                      <button type="button" key={time} className={expectedFinishTime === time ? "active" : ""} onClick={() => setExpectedFinishTime(time)}>
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="settings-field range-field">
              <div className="range-head">
                <span>多久无操作视为离开</span>
                <strong>{idleThreshold} 秒</strong>
              </div>
              <input
                type="range"
                min={30}
                max={300}
                step={15}
                value={idleThreshold}
                onChange={(event) => setIdleThreshold(Number(event.target.value))}
              />
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-head">
              <Flag size={16} />
              <div>
                <h3>节假日偏好</h3>
              </div>
            </div>
            <div className="region-switch">
              <button type="button" className={holidayRegion === "MO" ? "active" : ""} onClick={() => setHolidayRegion("MO")}>
                <Landmark size={14} /> 中国澳门
              </button>
              <button type="button" className={holidayRegion === "CN" ? "active" : ""} onClick={() => setHolidayRegion("CN")}>
                <Landmark size={14} /> 中国内地
              </button>
            </div>
            <div className="holiday-mode-list">
              {HOLIDAY_MODES.map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  className={`holiday-mode ${holidayMode === mode.value ? "active" : ""}`}
                  onClick={() => setHolidayMode(mode.value)}
                >
                  <span className="holiday-radio"><i /></span>
                  <span>
                    <strong>{mode.label}</strong>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section status-section">
            <div className="settings-section-head">
              <Settings2 size={16} />
              <div>
                <h3>系统状态</h3>
              </div>
            </div>
            <div className="status-grid">
              <div className="status-item">
                <i className="ok" />
                <span>Java API</span>
                <strong>在线</strong>
              </div>
              <div className="status-item">
                <i className={status?.engineAvailable ? "ok" : statusError ? "off" : "pending"} />
                <span>Python 排期引擎</span>
                <strong>{status ? (status.engineAvailable ? "在线" : "未连接") : statusError ? "未知" : "检查中"}</strong>
              </div>
              <div className="status-item">
                <i className="ok" />
                <span>数据层</span>
                <strong>MySQL</strong>
              </div>
            </div>
            {status?.engineMessage ? <p className="settings-note warn">{status.engineMessage}</p> : null}
          </section>

          {error ? <div className="form-error">{error}</div> : null}
        </div>

        <footer className="modal-foot">
          <Button variant="outlined" onClick={onClose} disabled={saving}>取消</Button>
          <Button variant="contained" onClick={save} disabled={saving} startIcon={saving ? <Spinner size={15} /> : <Check size={16} />}>
            {saving ? "保存中…" : "保存设置"}
          </Button>
        </footer>
      </div>
    </Dialog>
  );
}
