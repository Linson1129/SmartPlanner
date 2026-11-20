"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box, ButtonBase, Card, Chip, IconButton, LinearProgress, Skeleton, Stack, Typography,
} from "@mui/material";
import { ArrowUpRight, Flag, Settings2 } from "lucide-react";
import type { Overview, Profile, ScheduleEvent } from "@/lib/types";
import { formatCountdown, formatMonthDay, formatTime, parseDateTime } from "@/lib/dates";

interface UrgentDdlProps {
  overview: Overview | null;
  profile: Profile | null;
  onOpenEvent: (event: ScheduleEvent) => void;
  onOpenSettings: () => void;
}

export function UrgentDdl({ overview, profile, onOpenEvent, onOpenSettings }: UrgentDdlProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const ddl = overview?.urgentDdl ?? overview?.nextDdl ?? null;
  const withinExpected = ddl?.withinExpected ?? false;
  const details = useMemo(() => {
    if (!ddl) return null;
    const due = parseDateTime(ddl.event.dueAt);
    const start = parseDateTime(ddl.event.startAt);
    if (!due) return null;
    const minutesLeft = Math.max(0, Math.round((due.getTime() - now) / 60_000));
    const total = start ? Math.max(1, due.getTime() - start.getTime()) : 1;
    const progress = Math.min(100, Math.max(0, ((now - (start?.getTime() ?? due.getTime() - 3_600_000)) / total) * 100));
    return { due, minutesLeft, progress };
  }, [ddl, now]);

  const sx = {
    p: 1.5,
    bgcolor: "rgba(255,255,255,.035)",
    borderColor: "rgba(255,255,255,.09)",
    color: "rgba(255,255,255,.82)",
  } as const;

  if (!overview) {
    return (
      <Card variant="outlined" sx={sx}>
        <Skeleton width="45%" height={16} sx={{ bgcolor: "rgba(255,255,255,.08)" }} />
        <Skeleton width="90%" height={26} sx={{ bgcolor: "rgba(255,255,255,.08)" }} />
        <Skeleton width="60%" height={16} sx={{ bgcolor: "rgba(255,255,255,.08)" }} />
      </Card>
    );
  }

  if (!ddl || !details) {
    return (
      <Card variant="outlined" sx={sx}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "rgba(255,255,255,.5)" }}>
          <Flag size={13} />
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: ".06em" }}>最接近的 DDL</Typography>
        </Stack>
        <Typography sx={{ mt: 1, fontSize: 16, fontWeight: 650, color: "rgba(255,255,255,.72)" }}>
          暂无临期截止
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        ...sx,
        borderColor: withinExpected ? "rgba(255,255,255,.09)" : "rgba(233,134,102,.35)",
        background: withinExpected ? "rgba(255,255,255,.035)" : "rgba(195,77,43,.12)",
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        <Flag size={13} color={withinExpected ? undefined : "#f0a188"} />
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: ".05em", color: "rgba(255,255,255,.62)" }}>
          {withinExpected ? "最接近的 DDL" : "已超出预期收工"}
        </Typography>
        <IconButton size="small" onClick={onOpenSettings} aria-label="修改预期收工时间" sx={{ ml: "auto", color: "rgba(255,255,255,.45)" }}>
          <Settings2 size={13} />
        </IconButton>
      </Stack>

      <ButtonBase
        onClick={() => onOpenEvent(ddl.event)}
        sx={{ width: "100%", justifyContent: "flex-start", borderRadius: 1, mt: 0.75, color: "#fff" }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 650, lineHeight: 1.25, textAlign: "left" }} noWrap>
          {ddl.event.title}
        </Typography>
        <ArrowUpRight size={14} style={{ marginLeft: 4, flex: "none" }} />
      </ButtonBase>

      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 0.75 }}>
        <Typography sx={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>
          {formatMonthDay(details.due)} {formatTime(details.due)} 截止
        </Typography>
        <Chip
          size="small"
          label={formatCountdown(details.minutesLeft)}
          color={withinExpected ? "default" : "warning"}
          sx={{ height: 20, fontSize: 9.5, color: withinExpected ? "rgba(255,255,255,.65)" : undefined }}
        />
      </Stack>

      <LinearProgress
        variant="determinate"
        value={details.progress}
        color={withinExpected ? "primary" : "warning"}
        sx={{ mt: 1, height: 4, borderRadius: 4, bgcolor: "rgba(255,255,255,.1)" }}
      />

      <Typography sx={{ mt: 0.75, fontSize: 9.5, color: "rgba(255,255,255,.45)" }}>
        {withinExpected
          ? `预期 ${profile?.expectedFinishTime ?? "22:00"} 收工，还来得及`
          : `晚于预期 ${profile?.expectedFinishTime ?? "22:00"}，可以调整收工时间`}
      </Typography>
    </Card>
  );
}
