"""Deterministic scheduling rules.

The engine is intentionally pure: it receives a candidate event, the events that
already exist, the user's preferences and the current time, and returns conflicts,
holiday warnings and ranked repair suggestions. It never writes to the database;
the Java API owns persistence and asks the user before applying any suggestion.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Iterable

from .holidays import (
    first_workday_after_range,
    holiday_on,
    holidays_for_range,
)
from .models import (
    AnalysisOut,
    AnalyzeRequest,
    ChangeOut,
    ConflictOut,
    EngineEvent,
    EventStatus,
    EventType,
    HolidayMode,
    HolidayWarningOut,
    ProfileIn,
    SuggestionOut,
)

STEP_MINUTES = 5
MAX_SUGGESTIONS = 3
MAX_HORIZON_DAYS = 14
REGION_LABEL = {"CN": "中国内地", "MO": "中国澳门"}


# ---------------------------------------------------------------------------
# Small date helpers


def _minutes(delta: timedelta) -> int:
    return max(0, int(delta.total_seconds() // 60))


def _ceil_minutes(value: datetime, step: int = STEP_MINUTES) -> datetime:
    base = value.replace(second=0, microsecond=0)
    if value.second or value.microsecond:
        base += timedelta(minutes=1)
    remainder = base.minute % step
    if remainder:
        base += timedelta(minutes=step - remainder)
    return base


def _floor_minutes(value: datetime, step: int = STEP_MINUTES) -> datetime:
    base = value.replace(second=0, microsecond=0)
    return base - timedelta(minutes=base.minute % step)


def _fmt_time(value: datetime) -> str:
    return value.strftime("%H:%M")


def _fmt_day(value: datetime) -> str:
    return f"{value.month}月{value.day}日"


def _fmt_duration(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} 分钟"
    hours, rest = divmod(minutes, 60)
    return f"{hours} 小时" + (f" {rest} 分钟" if rest else "")


def _dates_between(start: date, end: date) -> Iterable[date]:
    current = start
    guard = 0
    while current <= end and guard < 62:
        yield current
        current += timedelta(days=1)
        guard += 1


def _is_closed(event: EngineEvent) -> bool:
    return event.status in {EventStatus.DONE, EventStatus.CANCELLED}


def _is_open_goal(event: EngineEvent) -> bool:
    return event.type == EventType.GOAL and event.end_at is None and not _is_closed(event)


def _may_share_time(left: EngineEvent, right: EngineEvent) -> bool:
    """Overlaps that the product deliberately allows."""
    if left.id is not None and left.id == right.id:
        return True
    if _is_open_goal(left) or _is_open_goal(right):
        # An open-ended goal is a background pursuit; it must not block the day.
        return True
    if (
        left.parent_id is not None
        and right.id is not None
        and left.parent_id == right.id
        and right.type == EventType.CONTAINER
    ):
        return True
    if (
        right.parent_id is not None
        and left.id is not None
        and right.parent_id == left.id
        and left.type == EventType.CONTAINER
    ):
        return True
    if left.parent_id is not None and left.parent_id == right.parent_id:
        # Siblings inside the same container may run in parallel.
        return True
    return False


def _effective_end(event: EngineEvent, now: datetime) -> datetime:
    return event.end_at or now


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and a_end > b_start


def conflicts_for(
    candidate: EngineEvent,
    events: list[EngineEvent],
    now: datetime,
) -> list[ConflictOut]:
    if _is_open_goal(candidate):
        return []
    if candidate.end_at is None or candidate.end_at <= candidate.start_at:
        return []

    conflicts: list[ConflictOut] = []
    for other in events:
        if candidate.id is not None and other.id == candidate.id:
            continue
        if _is_closed(other) or _is_open_goal(other):
            continue
        if _may_share_time(candidate, other):
            continue
        other_end = _effective_end(other, now)
        if other_end <= other.start_at:
            continue
        if not _overlaps(candidate.start_at, candidate.end_at, other.start_at, other_end):
            continue
        overlap = _minutes(
            min(candidate.end_at, other_end) - max(candidate.start_at, other.start_at)
        )
        conflicts.append(
            ConflictOut(
                event_id=other.id or 0,
                title=other.title or "未命名事件",
                type=other.type,
                start_at=other.start_at,
                end_at=other_end,
                overlap_minutes=max(1, overlap),
            )
        )
    conflicts.sort(key=lambda item: item.start_at)
    return conflicts


def holiday_warnings(candidate: EngineEvent, profile: ProfileIn) -> list[HolidayWarningOut]:
    if profile.holiday_mode == HolidayMode.OFF:
        return []
    start = candidate.start_at.date()
    end = (candidate.end_at or candidate.start_at).date()
    if end < start:
        end = start
    warnings: list[HolidayWarningOut] = []
    region = profile.holiday_region.value
    for day in _dates_between(start, end):
        holiday = holiday_on(day, region)
        if holiday is None:
            continue
        if profile.holiday_mode == HolidayMode.AVOID:
            message = (
                f"{day.month}月{day.day}日是「{holiday.name}」"
                f"（{REGION_LABEL[region]}公众假期）。你选择了提醒并建议避开，"
                "系统会给出改到工作日的方案。"
            )
        else:
            message = (
                f"{day.month}月{day.day}日是「{holiday.name}」"
                f"（{REGION_LABEL[region]}公众假期）。按你的偏好，这里只做提醒，不自动调整。"
            )
        warnings.append(
            HolidayWarningOut(
                date=day.isoformat(),
                name=holiday.name,
                mode=profile.holiday_mode,
                message=message,
            )
        )
    return warnings


def deadline_warning(candidate: EngineEvent, profile: ProfileIn) -> str | None:
    expected = profile.expected_finish_at
    if candidate.due_at is None or expected is None:
        return None
    if candidate.due_at <= expected:
        return None
    return (
        f"截止时间 {_fmt_day(candidate.due_at)} {_fmt_time(candidate.due_at)} "
        f"晚于你设定的预期收工时间 {_fmt_time(expected)}，缓冲可能不足。"
    )


# ---------------------------------------------------------------------------
# Suggestions


def _change(event: EngineEvent, start_at: datetime, end_at: datetime) -> ChangeOut | None:
    if event.id is None:
        return None
    return ChangeOut(
        event_id=event.id,
        title=event.title or "未命名事件",
        start_at=start_at,
        end_at=end_at,
        previous_start_at=event.start_at,
        previous_end_at=event.end_at,
    )


def _apply_changes(
    candidate: EngineEvent,
    events: list[EngineEvent],
    changes: list[ChangeOut],
) -> list[EngineEvent]:
    by_id = {change.event_id: change for change in changes}
    universe = [candidate] + [event for event in events if event.id != candidate.id]
    updated: list[EngineEvent] = []
    for event in universe:
        change = by_id.get(event.id)
        if change is None:
            updated.append(event)
        else:
            updated.append(
                event.model_copy(
                    update={"start_at": change.start_at, "end_at": change.end_at}
                )
            )
    return updated


def _validate(
    candidate: EngineEvent,
    events: list[EngineEvent],
    changes: list[ChangeOut],
    now: datetime,
) -> bool:
    if not changes:
        return True
    for change in changes:
        if change.end_at <= change.start_at:
            return False
    updated = _apply_changes(candidate, events, changes)
    target_ids = {candidate.id} | {change.event_id for change in changes}
    for target in updated:
        if target.id not in target_ids:
            continue
        peers = [event for event in updated if event.id != target.id]
        if conflicts_for(target, peers, now):
            return False
    return True


def _impact(changes: list[ChangeOut], extra_minutes: int = 0) -> str:
    if len(changes) <= 1 and extra_minutes <= 45:
        return "LOW"
    if len(changes) <= 3 and extra_minutes <= 180:
        return "MEDIUM"
    return "HIGH"


def _shift_later(
    candidate: EngineEvent,
    events: list[EngineEvent],
    conflicts: list[ConflictOut],
    now: datetime,
) -> SuggestionOut | None:
    if candidate.end_at is None:
        return None
    duration = candidate.end_at - candidate.start_at
    if duration <= timedelta(0) or duration > timedelta(hours=18):
        return None
    latest_end = max(conflict.end_at for conflict in conflicts)
    start = _ceil_minutes(latest_end + timedelta(minutes=STEP_MINUTES))
    horizon = candidate.start_at + timedelta(days=MAX_HORIZON_DAYS)
    while start <= horizon:
        trial = candidate.model_copy(update={"start_at": start, "end_at": start + duration})
        if not conflicts_for(trial, events, now):
            change = _change(candidate, start, start + duration)
            if change is None or not _validate(candidate, events, [change], now):
                return None
            shift_minutes = _minutes(start - candidate.start_at)
            names = "、".join(f"《{item.title}》" for item in conflicts[:2])
            return SuggestionOut(
                id="shift-later",
                strategy="SHIFT_LATER",
                label=f"整体后移 {_fmt_duration(shift_minutes)}",
                reason=(
                    f"保持时长不变，从 {_fmt_time(candidate.start_at)} 改到 "
                    f"{_fmt_day(start)} {_fmt_time(start)}，避开与{names}的重叠。"
                ),
                impact=_impact([change], shift_minutes),
                changes=[change],
            )
        start += timedelta(minutes=STEP_MINUTES)
    return None


def _shift_earlier(
    candidate: EngineEvent,
    events: list[EngineEvent],
    conflicts: list[ConflictOut],
    now: datetime,
) -> SuggestionOut | None:
    if candidate.end_at is None:
        return None
    duration = candidate.end_at - candidate.start_at
    if duration <= timedelta(0) or duration > timedelta(hours=12):
        return None
    earliest_conflict = min(conflict.start_at for conflict in conflicts)
    new_end = _floor_minutes(earliest_conflict - timedelta(minutes=STEP_MINUTES))
    new_start = new_end - duration
    if new_start < candidate.start_at - timedelta(days=1):
        return None
    if candidate.start_at.hour >= 6 and (new_start.hour < 6 or new_start.date() < candidate.start_at.date()):
        return None
    shift_minutes = _minutes(candidate.start_at - new_start)
    if shift_minutes < STEP_MINUTES or shift_minutes > 240:
        return None
    trial = candidate.model_copy(update={"start_at": new_start, "end_at": new_end})
    if conflicts_for(trial, events, now):
        return None
    change = _change(candidate, new_start, new_end)
    if change is None or not _validate(candidate, events, [change], now):
        return None
    names = "、".join(f"《{item.title}》" for item in conflicts[:2])
    return SuggestionOut(
        id="shift-earlier",
        strategy="SHIFT_EARLIER",
        label=f"整体提前 {_fmt_duration(shift_minutes)}",
        reason=(
            f"把这项安排挪到 {_fmt_day(new_start)} {_fmt_time(new_start)}，"
            f"在{names}开始前结束。"
        ),
        impact=_impact([change], shift_minutes),
        changes=[change],
    )


def _trim_previous(
    candidate: EngineEvent,
    events: list[EngineEvent],
    conflicts: list[ConflictOut],
    now: datetime,
) -> SuggestionOut | None:
    if len(conflicts) != 1 or candidate.end_at is None:
        return None
    conflict = conflicts[0]
    if not (conflict.start_at < candidate.start_at < conflict.end_at):
        return None
    previous = next((event for event in events if event.id == conflict.event_id), None)
    if previous is None or previous.end_at is None:
        return None
    if previous.type == EventType.CONTAINER:
        # Do not move a container without moving its children.
        return None
    overlap = _minutes(conflict.end_at - candidate.start_at)
    if overlap > 120:
        return None
    shift_minutes = max(10, int((overlap + STEP_MINUTES + STEP_MINUTES - 1) // STEP_MINUTES) * STEP_MINUTES)
    new_end = previous.end_at - timedelta(minutes=shift_minutes)
    new_start = previous.start_at - timedelta(minutes=shift_minutes)
    if previous.start_at.hour >= 6 and (new_start.hour < 6 or new_start.date() < previous.start_at.date()):
        return None
    change = _change(previous, new_start, new_end)
    if change is None or not _validate(candidate, events, [change], now):
        return None
    return SuggestionOut(
        id="trim-before",
        strategy="TRIM_PREVIOUS",
        label=f"把《{previous.title}》提前 {shift_minutes} 分钟",
        reason=(
            f"《{previous.title}》的结束时间压住了新安排。"
            f"让它提前开始、提前结束，两段时间就能刚好衔接。"
        ),
        impact="LOW",
        changes=[change],
    )


def _following_changes(
    candidate: EngineEvent,
    events: list[EngineEvent],
    conflicts: list[ConflictOut],
    now: datetime,
) -> list[ChangeOut] | None:
    if candidate.end_at is None or not conflicts:
        return None
    first_start = min(conflict.start_at for conflict in conflicts)
    needed = _minutes(candidate.end_at - first_start) + STEP_MINUTES
    delta = max(STEP_MINUTES, ((needed + STEP_MINUTES - 1) // STEP_MINUTES) * STEP_MINUTES)
    event_by_id = {event.id: event for event in events if event.id is not None}

    changes: dict[int, ChangeOut] = {}

    def add_shift(event: EngineEvent) -> bool:
        if event.id is None or event.id in changes:
            return True
        if event.end_at is None or _is_open_goal(event) or _is_closed(event):
            return True
        change = _change(
            event,
            event.start_at + timedelta(minutes=delta),
            event.end_at + timedelta(minutes=delta),
        )
        if change is None:
            return False
        changes[event.id] = change
        return True

    for conflict in conflicts:
        event = event_by_id.get(conflict.event_id)
        if event is None:
            return None
        if not add_shift(event):
            return None
        if event.type == EventType.CONTAINER:
            for child in events:
                if child.parent_id == event.id and not add_shift(child):
                    return None

    # Cascade: when a shifted block now runs into the next one, shift that too.
    queue = [event_by_id[event_id] for event_id in list(changes)]
    guard = 0
    while queue and len(changes) <= 10 and guard < 40:
        guard += 1
        moved = queue.pop(0)
        moved_change = changes.get(moved.id or -1)
        if moved_change is None:
            continue
        for other in events:
            if other.id is None or other.id in changes or other.id == candidate.id:
                continue
            if _is_closed(other) or _is_open_goal(other) or other.end_at is None:
                continue
            if _may_share_time(moved, other):
                continue
            if _overlaps(
                moved_change.start_at,
                moved_change.end_at,
                other.start_at,
                other.end_at,
            ):
                if not add_shift(other):
                    return None
                queue.append(other)

    if not changes:
        return None
    return list(changes.values())


def _move_following(
    candidate: EngineEvent,
    events: list[EngineEvent],
    conflicts: list[ConflictOut],
    now: datetime,
) -> SuggestionOut | None:
    changes = _following_changes(candidate, events, conflicts, now)
    if not changes:
        return None
    if not _validate(candidate, events, changes, now):
        # Fall back to moving only the direct conflicts if the cascade is unsafe.
        direct: list[ChangeOut] = []
        for conflict in conflicts:
            event = next((item for item in events if item.id == conflict.event_id), None)
            if event is None or event.end_at is None:
                return None
            shift = _minutes(candidate.end_at - conflict.start_at) + STEP_MINUTES if candidate.end_at else 0
            shift = max(STEP_MINUTES, ((shift + STEP_MINUTES - 1) // STEP_MINUTES) * STEP_MINUTES)
            change = _change(
                event,
                event.start_at + timedelta(minutes=shift),
                event.end_at + timedelta(minutes=shift),
            )
            if change:
                direct.append(change)
        if not direct or not _validate(candidate, events, direct, now):
            return None
        changes = direct
    shift_minutes = _minutes(
        changes[0].start_at - changes[0].previous_start_at
    )
    names = "、".join(f"《{change.title}》" for change in changes[:2])
    return SuggestionOut(
        id="move-following",
        strategy="MOVE_FOLLOWING",
        label=f"把后续 {len(changes)} 项顺延 {_fmt_duration(shift_minutes)}",
        reason=(
            f"你的新安排保持不动；{names}以及被挤到的后续安排一起后移，"
            "彼此之间的间隔保持不变。"
        ),
        impact=_impact(changes, shift_minutes),
        changes=changes,
    )


def _holiday_avoid(
    candidate: EngineEvent,
    events: list[EngineEvent],
    warnings: list[HolidayWarningOut],
    profile: ProfileIn,
    now: datetime,
) -> SuggestionOut | None:
    if not warnings or profile.holiday_mode != HolidayMode.AVOID:
        return None
    if candidate.end_at is None or _is_open_goal(candidate):
        return None
    start_day = candidate.start_at.date()
    end_day = candidate.end_at.date()
    if end_day < start_day:
        end_day = start_day
    region = profile.holiday_region.value
    new_day = first_workday_after_range(start_day, end_day, region)
    duration = candidate.end_at - candidate.start_at
    new_start = datetime.combine(new_day, candidate.start_at.time())
    new_end = new_start + duration
    change = _change(candidate, new_start, new_end)
    if change is None or not _validate(candidate, events, [change], now):
        return None
    return SuggestionOut(
        id="holiday-avoid",
        strategy="HOLIDAY_AVOID",
        label=f"避开假期，改到 {new_day.month}月{new_day.day}日",
        reason=(
            f"你选择了「提醒并建议避开」；{warnings[0].name}是公众假期，"
            "把这项安排整体挪到下一个工作日，起止时间保持不变。"
        ),
        impact="MEDIUM",
        changes=[change],
    )


def _dedupe(suggestions: list[SuggestionOut]) -> list[SuggestionOut]:
    seen: set[tuple] = set()
    result: list[SuggestionOut] = []
    for suggestion in suggestions:
        signature = tuple(
            sorted(
                (change.event_id, change.start_at.isoformat(), change.end_at.isoformat())
                for change in suggestion.changes
            )
        )
        if signature in seen:
            continue
        seen.add(signature)
        result.append(suggestion)
    return result


def analyze(request: AnalyzeRequest) -> AnalysisOut:
    now = request.now or datetime.now()
    candidate = request.candidate
    events = request.events
    conflicts = conflicts_for(candidate, events, now)
    warnings = holiday_warnings(candidate, request.profile)
    deadline = deadline_warning(candidate, request.profile)

    suggestions: list[SuggestionOut] = []
    if conflicts:
        for builder in (_shift_later, _trim_previous, _shift_earlier, _move_following):
            suggestion = builder(candidate, events, conflicts, now)
            if suggestion is not None:
                suggestions.append(suggestion)
    holiday_suggestion = _holiday_avoid(
        candidate, events, warnings, request.profile, now
    )
    if holiday_suggestion is not None:
        # Keep room for the holiday proposal even when conflicts exist.
        if len(suggestions) >= MAX_SUGGESTIONS:
            suggestions = suggestions[: MAX_SUGGESTIONS - 1]
        suggestions.append(holiday_suggestion)

    suggestions = _dedupe(suggestions)[:MAX_SUGGESTIONS]
    return AnalysisOut(
        engine_available=True,
        conflicts=conflicts,
        holiday_warnings=warnings,
        deadline_warning=deadline,
        suggestions=suggestions,
        generated_at=now,
    )
