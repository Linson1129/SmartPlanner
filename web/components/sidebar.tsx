"use client";

import { Avatar, Box, ButtonBase, Chip, Divider, IconButton, LinearProgress, List, ListItemButton, ListItemIcon, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { Calendar, CalendarDays, CalendarRange, Flag, PanelLeftClose, Settings2, Target, X } from "lucide-react";
import type { Holiday, Overview, Profile, ScheduleEvent, ViewMode } from "@/lib/types";
import { MiniCalendar } from "./mini-calendar";
import { UrgentDdl } from "./urgent-ddl";
import { formatDuration } from "@/lib/dates";

interface SidebarProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  holidays: Holiday[];
  overview: Overview | null;
  profile: Profile | null;
  presenceActive: boolean;
  presenceOnline: boolean;
  mobileOpen: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onOpenSettings: () => void;
  onOpenEvent: (event: ScheduleEvent) => void;
}

const NAV: Array<{ value: ViewMode; label: string; icon: typeof Calendar }> = [
  { value: "day", label: "日视图", icon: CalendarDays },
  { value: "week", label: "周视图", icon: CalendarRange },
  { value: "month", label: "月视图", icon: Calendar },
];

export function Sidebar({
  view,
  onViewChange,
  selectedDate,
  onSelectDate,
  holidays,
  overview,
  profile,
  presenceActive,
  presenceOnline,
  mobileOpen,
  collapsed,
  onToggleCollapse,
  onCloseMobile,
  onOpenSettings,
  onOpenEvent,
}: SidebarProps) {
  const done = overview?.completedToday ?? 0;
  const total = overview?.todayCount ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const ddl = overview?.urgentDdl ?? overview?.nextDdl ?? null;
  const white = "rgba(255,255,255,.82)";
  const muted = "rgba(255,255,255,.48)";

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop ${mobileOpen ? "show" : ""}`}
        onClick={onCloseMobile}
        aria-label="关闭侧栏"
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside className={`sidebar mui-sidebar ${mobileOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <Box sx={{ p: collapsed ? 1.25 : 2.25, pb: 1.5 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 38, height: 38, flex: "none",
                bgcolor: "primary.main", color: "#fff",
                fontWeight: 800, fontSize: 20, borderRadius: 2.25,
              }}
            >
              S
            </Avatar>
            {!collapsed ? (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.1, fontSize: 17 }}>
                  SmartPlanner
                </Typography>
                <Typography sx={{ color: muted, fontSize: 10, mt: 0.35 }}>
                  日序 · 个人日程
                </Typography>
              </Box>
            ) : null}
            <IconButton
              className="sidebar-mobile-close"
              size="small"
              onClick={onCloseMobile}
              aria-label="关闭侧栏"
              sx={{ display: { xs: "inline-flex", md: "none" }, color: white }}
            >
              <X size={17} />
            </IconButton>
            {!collapsed ? (
              <Tooltip title="收起侧栏">
                <IconButton size="small" onClick={onToggleCollapse} sx={{ color: muted }}>
                  <PanelLeftClose size={16} />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        </Box>

        <Box className="sidebar-scroll" sx={{ px: collapsed ? 0.75 : 1.25, pb: 1 }}>
          <List dense disablePadding>
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <ListItemButton
                  key={item.value}
                  selected={view === item.value}
                  onClick={() => {
                    onViewChange(item.value);
                    onCloseMobile();
                  }}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    minHeight: 46,
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: white,
                    "&.Mui-selected": {
                      bgcolor: "rgba(37, 99, 235, .3)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(37, 99, 235, .4)" },
                    },
                    "&:hover": { bgcolor: "rgba(255,255,255,.07)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: "inherit", justifyContent: "center" }}>
                    <Icon size={18} strokeWidth={1.8} />
                  </ListItemIcon>
                  {!collapsed ? (
                    <Typography sx={{ color: "inherit", fontSize: 12, fontWeight: 650, lineHeight: 1.4 }}>
                      {item.label}
                    </Typography>
                  ) : null}
                </ListItemButton>
              );
            })}
          </List>

          <Divider sx={{ borderColor: "rgba(255,255,255,.08)", my: 1.25 }} />

          {collapsed ? (
            <Stack sx={{ alignItems: "center", mt: 1 }}>
              <Tooltip title={ddl ? `最接近的 DDL：${ddl.event.title}` : "暂无临期 DDL"}>
                <IconButton
                  size="small"
                  onClick={() => ddl && onOpenEvent(ddl.event)}
                  sx={{ color: ddl ? "primary.light" : muted }}
                  aria-label={ddl ? `最接近的 DDL：${ddl.event.title}` : "暂无临期 DDL"}
                >
                  <Flag size={17} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {view !== "month" ? (
                <MiniCalendar selectedDate={selectedDate} holidays={holidays} onSelectDate={onSelectDate} />
              ) : null}

              <UrgentDdl
                overview={overview}
                profile={profile}
                onOpenEvent={onOpenEvent}
                onOpenSettings={onOpenSettings}
              />

              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(255,255,255,.035)",
                  borderColor: "rgba(255,255,255,.09)",
                  color: white,
                }}
              >
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 10, color: muted, letterSpacing: ".08em", fontWeight: 700 }}>
                    今日节奏
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "primary.light", fontWeight: 700 }}>
                    {percent}%
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline", mt: 0.75 }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{done}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: muted }}>/ {total} 项完成</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    mt: 1.25, height: 5, borderRadius: 4,
                    bgcolor: "rgba(255,255,255,.1)",
                    "& .MuiLinearProgress-bar": { borderRadius: 4 },
                  }}
                />
                <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1 }}>
                  <Typography sx={{ fontSize: 9.5, color: muted }}>
                    {formatDuration(overview?.todayMinutes ?? 0)} 已排入
                  </Typography>
                  <Stack direction="row" spacing={0.4} sx={{ alignItems: "center", color: muted }}>
                    <Target size={11} />
                    <Typography sx={{ fontSize: 9.5, color: "inherit" }}>
                      {overview?.activeGoals ?? 0} 个目标
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          )}
        </Box>

        <Box sx={{ p: collapsed ? 1 : 1.5, borderTop: 1, borderColor: "rgba(255,255,255,.08)" }}>
          {!collapsed ? (
            <Chip
              size="small"
              variant="outlined"
              label={!presenceOnline ? "连接中" : presenceActive ? "你正活跃 · 强提醒暂缓" : "已离开 · 提醒可送达"}
              sx={{
                mb: 1, width: "100%", justifyContent: "flex-start",
                color: muted, borderColor: "rgba(255,255,255,.1)", fontSize: 9.5,
              }}
            />
          ) : null}
          <ButtonBase
            onClick={onOpenSettings}
            sx={{
              width: "100%", p: 0.75, borderRadius: 2, justifyContent: "flex-start",
              color: white, "&:hover": { bgcolor: "rgba(255,255,255,.05)" },
            }}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: "rgba(255,255,255,.14)", fontSize: 13, fontWeight: 700 }}>
              {(profile?.displayName ?? "S").slice(0, 1)}
            </Avatar>
            {!collapsed ? (
              <Box sx={{ ml: 1, minWidth: 0, flex: 1, textAlign: "left" }}>
                <Typography sx={{ color: "#fff", fontSize: 11.5, fontWeight: 650, lineHeight: 1.3 }} noWrap>
                  {profile?.displayName ?? "日程主人"}
                </Typography>
                <Typography sx={{ color: muted, fontSize: 9.5, lineHeight: 1.3 }}>
                  {profile ? `预期 ${profile.expectedFinishTime} 收工` : "设置与提醒"}
                </Typography>
              </Box>
            ) : null}
            {!collapsed ? <Settings2 size={15} style={{ color: muted }} /> : null}
          </ButtonBase>
        </Box>
      </aside>
    </>
  );
}
