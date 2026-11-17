from __future__ import annotations

from datetime import datetime

from app.models import (
    AnalyzeRequest,
    EngineEvent,
    EventStatus,
    EventType,
    HolidayMode,
    HolidayRegion,
    Priority,
    ProfileIn,
)
from app.rules import analyze, conflicts_for


def dt(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 11, day, hour, minute)


def event(
    event_id: int,
    title: str,
    start: datetime,
    end: datetime | None,
    *,
    type: EventType = EventType.NORMAL,
    parent_id: int | None = None,
    status: EventStatus = EventStatus.PLANNED,
    due: datetime | None = None,
) -> EngineEvent:
    return EngineEvent(
        id=event_id,
        title=title,
        type=type,
        priority=Priority.MEDIUM,
        status=status,
        start_at=start,
        end_at=end,
        due_at=due,
        parent_id=parent_id,
    )


def test_normal_events_conflict():
    candidate = event(1, "写报告", dt(5, 14), dt(5, 15))
    other = event(2, "开会", dt(5, 14, 30), dt(5, 15, 30))
    conflicts = conflicts_for(candidate, [candidate, other], dt(5, 9))
    assert len(conflicts) == 1
    assert conflicts[0].event_id == 2
    assert conflicts[0].overlap_minutes == 30


def test_adjacent_events_do_not_conflict():
    candidate = event(1, "A", dt(5, 14), dt(5, 15))
    other = event(2, "B", dt(5, 15), dt(5, 16))
    assert conflicts_for(candidate, [candidate, other], dt(5, 9)) == []


def test_container_children_can_overlap_each_other():
    parent = event(1, "晚间并行", dt(5, 20), dt(5, 21), type=EventType.CONTAINER)
    laundry = event(2, "洗衣机", dt(5, 20, 15), dt(5, 20, 45), parent_id=1)
    nap = event(3, "小憩", dt(5, 20, 20), dt(5, 20, 50), parent_id=1)
    assert conflicts_for(laundry, [parent, laundry, nap], dt(5, 9)) == []


def test_chatty_casual_event_still_blocks_normal_event():
    candidate = event(1, "阅读", dt(5, 14), dt(5, 15), type=EventType.CASUAL)
    other = event(2, "会议", dt(5, 14, 30), dt(5, 15, 30))
    assert len(conflicts_for(candidate, [candidate, other], dt(5, 9))) == 1


def test_container_does_not_swallow_unrelated_events():
    candidate = event(1, "工作时段", dt(5, 9), dt(5, 18), type=EventType.CONTAINER)
    other = event(2, "看牙医", dt(5, 14), dt(5, 15))
    assert len(conflicts_for(candidate, [candidate, other], dt(5, 9))) == 1


def test_open_goal_does_not_block_the_day():
    goal = event(1, "写书", dt(1, 9), None, type=EventType.GOAL)
    candidate = event(2, "午饭", dt(5, 12), dt(5, 13))
    assert conflicts_for(candidate, [goal, candidate], dt(5, 9)) == []


def test_shift_later_suggestion_resolves_conflict():
    candidate = event(100, "深度工作", dt(5, 14), dt(5, 15))
    other = event(2, "会议", dt(5, 14, 30), dt(5, 15, 30))
    result = analyze(
        AnalyzeRequest(candidate=candidate, events=[candidate, other], now=dt(5, 9))
    )
    assert result.conflicts
    later = next(item for item in result.suggestions if item.strategy == "SHIFT_LATER")
    assert later.changes[0].start_at >= other.end_at
    assert later.changes[0].end_at == later.changes[0].start_at + (candidate.end_at - candidate.start_at)


def test_trim_previous_suggestion_moves_previous_block_earlier():
    candidate = event(100, "新安排", dt(5, 14), dt(5, 15))
    other = event(2, "旧会议", dt(5, 13, 30), dt(5, 14, 10))
    result = analyze(
        AnalyzeRequest(candidate=candidate, events=[candidate, other], now=dt(5, 9))
    )
    trim = next(item for item in result.suggestions if item.strategy == "TRIM_PREVIOUS")
    change = trim.changes[0]
    assert change.event_id == 2
    assert change.end_at <= candidate.start_at
    assert change.end_at - change.start_at == other.end_at - other.start_at


def test_move_following_cascades_without_gaps():
    candidate = event(100, "新安排", dt(5, 14), dt(5, 15))
    b = event(2, "B", dt(5, 13, 55), dt(5, 14, 30))
    c = event(3, "C", dt(5, 14, 30), dt(5, 15, 40))
    result = analyze(
        AnalyzeRequest(candidate=candidate, events=[candidate, b, c], now=dt(5, 9))
    )
    move = next(item for item in result.suggestions if item.strategy == "MOVE_FOLLOWING")
    by_id = {change.event_id: change for change in move.changes}
    assert by_id[2].start_at >= candidate.end_at
    assert by_id[3].start_at >= by_id[2].end_at


def test_holiday_soft_warning_mo():
    candidate = event(100, "圣诞晚餐", datetime(2026, 12, 25, 18), datetime(2026, 12, 25, 20))
    result = analyze(
        AnalyzeRequest(
            candidate=candidate,
            events=[candidate],
            profile=ProfileIn(holiday_mode=HolidayMode.SOFT, holiday_region=HolidayRegion.MO),
            now=dt(5, 9),
        )
    )
    assert len(result.holiday_warnings) == 1
    assert "圣诞节" in result.holiday_warnings[0].name
    assert not result.suggestions


def test_holiday_off_suppresses_warning():
    candidate = event(100, "圣诞晚餐", datetime(2026, 12, 25, 18), datetime(2026, 12, 25, 20))
    result = analyze(
        AnalyzeRequest(
            candidate=candidate,
            events=[candidate],
            profile=ProfileIn(holiday_mode=HolidayMode.OFF),
            now=dt(5, 9),
        )
    )
    assert result.holiday_warnings == []


def test_holiday_avoid_suggests_next_workday():
    candidate = event(100, "圣诞晚餐", datetime(2026, 12, 25, 18), datetime(2026, 12, 25, 20))
    result = analyze(
        AnalyzeRequest(
            candidate=candidate,
            events=[candidate],
            profile=ProfileIn(holiday_mode=HolidayMode.AVOID, holiday_region=HolidayRegion.MO),
            now=dt(5, 9),
        )
    )
    assert any(item.strategy == "HOLIDAY_AVOID" for item in result.suggestions)
    change = next(item for item in result.suggestions if item.strategy == "HOLIDAY_AVOID").changes[0]
    assert change.start_at.date().isoformat() == "2026-12-28"


def test_deadline_warning_uses_expected_finish():
    candidate = event(100, "提交材料", dt(5, 19), dt(5, 20), due=dt(5, 23, 59))
    result = analyze(
        AnalyzeRequest(
            candidate=candidate,
            events=[candidate],
            profile=ProfileIn(expected_finish_at=dt(5, 22)),
            now=dt(5, 9),
        )
    )
    assert result.deadline_warning is not None
    assert "晚于" in result.deadline_warning


def test_no_deadline_warning_within_expected_finish():
    candidate = event(100, "提交材料", dt(5, 19), dt(5, 20), due=dt(5, 21, 30))
    result = analyze(
        AnalyzeRequest(
            candidate=candidate,
            events=[candidate],
            profile=ProfileIn(expected_finish_at=dt(5, 22)),
            now=dt(5, 9),
        )
    )
    assert result.deadline_warning is None
