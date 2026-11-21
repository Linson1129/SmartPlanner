"use client";

import { Box, Button, Chip, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { Calendar, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Plus, Sparkles } from "lucide-react";
import type { Holiday, Profile, ViewMode } from "@/lib/types";
import { formatMonthDay, formatMonthTitle, formatWeekRange, greeting, isSameDay, weekdayLabel } from "@/lib/dates";

interface TopbarProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedDate: Date;
  profile: Profile | null;
  holiday: Holiday | null;
  loading: boolean;
  presenceActive: boolean;
  presenceOnline: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
  onQuickAdd: () => void;
  onOpenMenu: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({
  view,
  onViewChange,
  selectedDate,
  profile,
  holiday,
  loading,
  presenceActive,
  presenceOnline,
  onPrev,
  onNext,
  onToday,
  onAdd,
  onQuickAdd,
  onOpenMenu,
  sidebarCollapsed,
  onToggleSidebar,
}: TopbarProps) {
  const title = view === "day"
    ? formatMonthDay(selectedDate)
    : view === "week"
      ? formatWeekRange(selectedDate)
      : formatMonthTitle(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());
  const presenceLabel = !presenceOnline ? "离线" : presenceActive ? "专注中" : "离开中";

  return (
    <header className="topbar mui-topbar">
      {loading ? <div className="top-progress" /> : null}
      <Box className="topbar-main" sx={{ alignItems: "center", gap: 2 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", minWidth: 0 }}>
          <IconButton className="mobile-menu" onClick={onOpenMenu} aria-label="打开侧栏" size="small" sx={{ display: { xs: "inline-flex", md: "none" } }}>
            <Menu size={19} />
          </IconButton>
          <Tooltip title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}>
            <IconButton className="desktop-sidebar-toggle" onClick={onToggleSidebar} size="small" aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"} sx={{ display: { xs: "none", md: "inline-flex" } }}>
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </IconButton>
          </Tooltip>
          <Box sx={{ minWidth: 0, ml: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {greeting(new Date())}，{profile?.displayName ?? "日程主人"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.25 }}>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {title}
              </Typography>
              {view === "day" ? <Chip label={weekdayLabel(selectedDate)} size="small" variant="outlined" /> : null}
              {holiday ? <Chip label={holiday.name} size="small" color="warning" variant="outlined" /> : null}
            </Stack>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", ml: "auto" }}
        >
          <Chip
            size="small"
            variant="outlined"
            color={presenceActive ? "success" : presenceOnline ? "default" : "error"}
            label={presenceLabel}
            sx={{ display: { xs: "none", md: "inline-flex" } }}
          />

          <Tabs
            value={view}
            onChange={(_, value: ViewMode) => onViewChange(value)}
            aria-label="切换视图"
            sx={{ minHeight: 36, border: 1, borderColor: "divider", borderRadius: 2, px: 0.25 }}
          >
            <Tab value="day" icon={<CalendarDays size={15} />} iconPosition="start" label="日" sx={{ minHeight: 34, py: 0.25, px: 1.25 }} />
            <Tab value="week" icon={<CalendarRange size={15} />} iconPosition="start" label="周" sx={{ minHeight: 34, py: 0.25, px: 1.25 }} />
            <Tab value="month" icon={<Calendar size={15} />} iconPosition="start" label="月" sx={{ minHeight: 34, py: 0.25, px: 1.25 }} />
          </Tabs>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <IconButton size="small" onClick={onPrev} aria-label="上一段">
              <ChevronLeft size={18} />
            </IconButton>
            <Button size="small" variant={isToday ? "contained" : "outlined"} onClick={onToday}>
              今天
            </Button>
            <IconButton size="small" onClick={onNext} aria-label="下一段">
              <ChevronRight size={18} />
            </IconButton>
          </Stack>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Sparkles size={15} />}
            onClick={onQuickAdd}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            一句话
          </Button>

          <Button size="small" variant="contained" startIcon={<Plus size={17} />} onClick={onAdd}>
            新建安排
          </Button>
        </Stack>
      </Box>
    </header>
  );
}
