"use client";

import { AlertTriangle, CheckCircle2, Coffee, Info, Layers, Loader2, Star, Target, X } from "lucide-react";
import type { EventType, Priority } from "@/lib/types";
import { EVENT_TYPE_META, PRIORITY_META } from "@/lib/types";

export function EventGlyph({ type, size = 14 }: { type: EventType; size?: number }) {
  const props = { size, strokeWidth: 1.9 } as const;
  switch (type) {
    case "IMPORTANT":
      return <Star {...props} />;
    case "CASUAL":
      return <Coffee {...props} />;
    case "CONTAINER":
      return <Layers {...props} />;
    case "GOAL":
      return <Target {...props} />;
    default:
      return <span className="glyph-dot" style={{ width: size * 0.55, height: size * 0.55 }} />;
  }
}

export function TypeBadge({ type }: { type: EventType }) {
  return (
    <span className={`type-badge type-${type.toLowerCase()}`}>
      <EventGlyph type={type} size={12} />
      {EVENT_TYPE_META[type].short}
    </span>
  );
}

export function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span className={`priority-chip priority-${priority.toLowerCase()}`}>
      <i />
      {PRIORITY_META[priority].label}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 className="spin" size={size} strokeWidth={2} />;
}

export function ToastIcon({ tone }: { tone: "success" | "error" | "warn" | "info" | "reminder" }) {
  if (tone === "success") return <CheckCircle2 size={18} />;
  if (tone === "error" || tone === "warn") return <AlertTriangle size={18} />;
  if (tone === "reminder") return <Star size={18} />;
  return <Info size={18} />;
}

export function CloseButton({ onClick, label = "关闭" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="icon-button close-button" onClick={onClick} aria-label={label}>
      <X size={18} />
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
