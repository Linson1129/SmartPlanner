"""Built-in public holiday calendar.

The data below is transcribed from official 2026 notices:
- China State Council, Guobanfamingdian [2025] No. 7
- Macao SAR Government public holidays 2026

Keeping the calendar in one module makes it easy to replace with an external
holiday provider later without touching the scheduling rules.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

Region = Literal["CN", "MO"]
HolidayKind = Literal["PUBLIC_HOLIDAY", "WORKDAY"]


@dataclass(frozen=True)
class Holiday:
    date: date
    name: str
    kind: HolidayKind
    region: Region

    def as_dict(self) -> dict[str, str]:
        return {
            "date": self.date.isoformat(),
            "name": self.name,
            "kind": self.kind,
            "region": self.region,
        }


def _span(
    start: date,
    end: date,
    name: str,
    region: Region,
    kind: HolidayKind = "PUBLIC_HOLIDAY",
) -> list[Holiday]:
    days: list[Holiday] = []
    current = start
    while current <= end:
        days.append(Holiday(current, name, kind, region))
        current += timedelta(days=1)
    return days


def _one(day: date, name: str, region: Region, kind: HolidayKind = "PUBLIC_HOLIDAY") -> Holiday:
    return Holiday(day, name, kind, region)


HOLIDAYS: list[Holiday] = []
HOLIDAYS += _span(date(2026, 1, 1), date(2026, 1, 3), "元旦", "CN")
HOLIDAYS.append(_one(date(2026, 1, 4), "元旦调休上班", "CN", "WORKDAY"))
HOLIDAYS += _span(date(2026, 2, 15), date(2026, 2, 23), "春节", "CN")
HOLIDAYS.append(_one(date(2026, 2, 14), "春节调休上班", "CN", "WORKDAY"))
HOLIDAYS.append(_one(date(2026, 2, 28), "春节调休上班", "CN", "WORKDAY"))
HOLIDAYS += _span(date(2026, 4, 4), date(2026, 4, 6), "清明节", "CN")
HOLIDAYS += _span(date(2026, 5, 1), date(2026, 5, 5), "劳动节", "CN")
HOLIDAYS.append(_one(date(2026, 5, 9), "劳动节调休上班", "CN", "WORKDAY"))
HOLIDAYS += _span(date(2026, 6, 19), date(2026, 6, 21), "端午节", "CN")
HOLIDAYS += _span(date(2026, 9, 25), date(2026, 9, 27), "中秋节", "CN")
HOLIDAYS.append(_one(date(2026, 9, 20), "国庆节调休上班", "CN", "WORKDAY"))
HOLIDAYS += _span(date(2026, 10, 1), date(2026, 10, 7), "国庆节", "CN")
HOLIDAYS.append(_one(date(2026, 10, 10), "国庆节调休上班", "CN", "WORKDAY"))

# Macao public holidays (the compulsory ones marked with * in the official table
# are included together with the other public holidays).
HOLIDAYS.append(_one(date(2026, 1, 1), "元旦", "MO"))
HOLIDAYS += _span(date(2026, 2, 17), date(2026, 2, 19), "农历新年", "MO")
HOLIDAYS.append(_one(date(2026, 4, 3), "耶稣受难日", "MO"))
HOLIDAYS.append(_one(date(2026, 4, 4), "复活节前日", "MO"))
HOLIDAYS.append(_one(date(2026, 4, 5), "清明节", "MO"))
HOLIDAYS.append(_one(date(2026, 5, 1), "劳动节", "MO"))
HOLIDAYS.append(_one(date(2026, 5, 24), "佛诞节", "MO"))
HOLIDAYS.append(_one(date(2026, 6, 19), "端午节", "MO"))
HOLIDAYS.append(_one(date(2026, 9, 26), "中秋节翌日", "MO"))
HOLIDAYS.append(_one(date(2026, 10, 1), "中华人民共和国国庆日", "MO"))
HOLIDAYS.append(_one(date(2026, 10, 2), "国庆日翌日", "MO"))
HOLIDAYS.append(_one(date(2026, 10, 18), "重阳节", "MO"))
HOLIDAYS.append(_one(date(2026, 11, 2), "追思节", "MO"))
HOLIDAYS.append(_one(date(2026, 12, 8), "圣母无原罪瞻礼", "MO"))
HOLIDAYS.append(_one(date(2026, 12, 20), "澳门特别行政区成立纪念日", "MO"))
HOLIDAYS.append(_one(date(2026, 12, 22), "冬至", "MO"))
HOLIDAYS.append(_one(date(2026, 12, 24), "圣诞节前日", "MO"))
HOLIDAYS.append(_one(date(2026, 12, 25), "圣诞节", "MO"))

_BY_REGION: dict[str, dict[date, Holiday]] = {"CN": {}, "MO": {}}
for _holiday in HOLIDAYS:
    # PUBLIC_HOLIDAY wins if a date is ever listed twice for a region.
    existing = _BY_REGION[_holiday.region].get(_holiday.date)
    if existing is None or _holiday.kind == "PUBLIC_HOLIDAY":
        _BY_REGION[_holiday.region][_holiday.date] = _holiday


def holidays_for_range(start: date, end: date, region: Region) -> list[Holiday]:
    return [
        entry
        for day, entry in sorted(_BY_REGION[region].items())
        if start <= day <= end
    ]


def holidays_for_year(year: int, region: Region) -> list[Holiday]:
    return holidays_for_range(date(year, 1, 1), date(year, 12, 31), region)


def holiday_on(day: date, region: Region) -> Holiday | None:
    entry = _BY_REGION[region].get(day)
    return entry if entry and entry.kind == "PUBLIC_HOLIDAY" else None


def is_workday(day: date, region: Region) -> bool:
    entry = _BY_REGION[region].get(day)
    if entry is not None:
        return entry.kind == "WORKDAY"
    return day.weekday() < 5


def next_workday(day: date, region: Region, include_day: bool = False) -> date:
    current = day if include_day else day + timedelta(days=1)
    for _ in range(370):
        if is_workday(current, region):
            return current
        current += timedelta(days=1)
    return day


def first_workday_after_range(start: date, end: date, region: Region) -> date:
    current = end + timedelta(days=1)
    for _ in range(370):
        if is_workday(current, region) and all(
            is_workday(current + timedelta(days=offset), region)
            for offset in range((end - start).days + 1)
        ):
            return current
        current += timedelta(days=1)
    return end + timedelta(days=1)
