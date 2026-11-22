"""A small, deterministic Chinese quick-add parser.

This is a local rule-based parser. It recognises the patterns that matter for a
personal planner (relative dates, weekdays, explicit dates, periods, Chinese
numbers and durations) and returns a draft for the user to confirm. Low
confidence is surfaced to the UI instead of being hidden.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from .models import EventType, NlpDraftOut, Priority

CN_NUMBERS = {
    "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
    "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
}
WEEKDAYS = {"一": 0, "二": 1, "三": 2, "四": 3, "五": 4, "六": 5, "日": 6, "天": 6}
PERIOD_DEFAULT = {
    "凌晨": 0,
    "早上": 8,
    "上午": 9,
    "中午": 12,
    "下午": 14,
    "傍晚": 18,
    "晚上": 20,
    "夜里": 21,
}
FILLER_PREFIXES = ("请帮我", "帮我", "麻烦", "记得", "安排一下", "安排", "添加", "新增", "我要", "我想", "我")
TYPE_WORDS = {
    EventType.IMPORTANT: ("重要", "面试", "考试", "体检", "答辩", "纪念日", "手术"),
    EventType.CASUAL: ("散步", "休息", "喝咖啡", "随意", "放松"),
    EventType.GOAL: ("目标", "坚持", "打卡", "读完", "写完"),
}


def _cn_number(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    if not value:
        return None
    if value == "十":
        return 10
    if "十" in value:
        left, _, right = value.partition("十")
        tens = CN_NUMBERS.get(left, 1) if left else 1
        ones = CN_NUMBERS.get(right, 0) if right else 0
        return tens * 10 + ones
    if len(value) == 1:
        return CN_NUMBERS.get(value)
    return None


def _strip_fillers(text: str) -> str:
    result = text.strip(" \t，,。；;.!！?？：:")
    changed = True
    while changed:
        changed = False
        for prefix in FILLER_PREFIXES:
            if result.startswith(prefix) and len(result) > len(prefix):
                result = result[len(prefix):].strip(" \t，,。；;.!！?？：:")
                changed = True
    return result


def _find_date(text: str, now: datetime) -> tuple[date, str | None, float]:
    today = now.date()
    if "大后天" in text:
        return today + timedelta(days=3), "大后天", 0.2
    if "后天" in text:
        return today + timedelta(days=2), "后天", 0.2
    if "明天" in text or "明日" in text:
        return today + timedelta(days=1), "明天", 0.2
    if "今天" in text or "今日" in text:
        return today, "今天", 0.15
    if "今晚" in text:
        return today, "今晚", 0.15
    if "明晚" in text:
        return today + timedelta(days=1), "明晚", 0.15

    explicit = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})[日号]?", text)
    if explicit:
        try:
            value = date(int(explicit.group(1)), int(explicit.group(2)), int(explicit.group(3)))
            return value, explicit.group(0), 0.25
        except ValueError:
            pass
    month_day = re.search(r"(\d{1,2})月(\d{1,2})[日号]", text)
    if month_day:
        month, day = int(month_day.group(1)), int(month_day.group(2))
        year = today.year
        try:
            value = date(year, month, day)
            if value < today:
                value = date(year + 1, month, day)
            return value, month_day.group(0), 0.22
        except ValueError:
            pass
    slash_date = re.search(r"(?<!\d)(\d{1,2})/(\d{1,2})(?!\d)", text)
    if slash_date:
        month, day = int(slash_date.group(1)), int(slash_date.group(2))
        try:
            value = date(today.year, month, day)
            if value < today:
                value = date(today.year + 1, month, day)
            return value, slash_date.group(0), 0.2
        except ValueError:
            pass

    week_match = re.search(r"(下)?(?:周|星期)([一二三四五六日天])", text)
    if week_match:
        next_week, weekday_text = week_match.group(1), week_match.group(2)
        target = WEEKDAYS[weekday_text]
        if next_week:
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            value = today + timedelta(days=days_until_monday + target)
        else:
            delta = (target - today.weekday()) % 7
            value = today + timedelta(days=delta)
        return value, week_match.group(0), 0.2
    return today, None, 0.0


PERIOD_PATTERN = r"(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)"
PERIOD_TEXT = ("凌晨", "早上", "上午", "中午", "下午", "傍晚", "晚上", "夜里")
MINUTE_PATTERN = r"(半|一刻|三刻|[0-9]{1,2}分?|[一二两三四五六七八九十]{1,3}分?)"


@dataclass
class TimeSpan:
    hour: int | None
    minute: int = 0
    end_hour: int | None = None
    end_minute: int | None = None
    text: str | None = None
    confidence: float = 0.0
    period: str | None = None


def _minute_value(value: str | None) -> int:
    if not value:
        return 0
    value = value.replace("分", "")
    if value == "半":
        return 30
    if value == "一刻":
        return 15
    if value == "三刻":
        return 45
    number = _cn_number(value)
    return number if number is not None else 0


def _period_hour(hour: int, period: str | None, text: str) -> int:
    if period in ("下午", "傍晚") and hour < 12:
        hour += 12
    elif period in ("晚上", "夜里"):
        if hour == 12:
            hour = 0
        elif hour < 12:
            hour += 12
    elif period == "中午" and hour < 11:
        hour += 12
    elif period == "凌晨" and hour == 12:
        hour = 0
    elif period is None and ("今晚" in text or "明晚" in text) and hour < 12:
        hour += 12
    return hour % 24


def _nearest_period(text: str, index: int) -> str | None:
    matches = list(re.finditer(PERIOD_PATTERN, text[:index]))
    return matches[-1].group(1) if matches else None


def _find_time(text: str) -> TimeSpan:
    # 1) 15:30 / 下午3:30
    clock = re.search(
        rf"(?:{PERIOD_PATTERN}\s*)?(?<!\d)([01]?\d|2[0-3])[:：]([0-5]\d)",
        text,
    )
    if clock:
        period = clock.group(1) or _nearest_period(text, clock.start())
        hour = _period_hour(int(clock.group(2)), period, text)
        return TimeSpan(hour, int(clock.group(3)), text=clock.group(0), confidence=0.3, period=period)

    # 2) 下午4点到6点 / 16-18点
    separated = re.search(
        rf"(?:{PERIOD_PATTERN}\s*)?([0-9]{{1,2}}|[一二两三四五六七八九十]{{1,3}})\s*"
        rf"(?:到|至|[-~—–])\s*([0-9]{{1,2}}|[一二两三四五六七八九十]{{1,3}})\s*[点时](?:{MINUTE_PATTERN})?",
        text,
    )
    if separated:
        period = separated.group(1) or _nearest_period(text, separated.start())
        start_hour = _cn_number(separated.group(2))
        end_hour = _cn_number(separated.group(3))
        if start_hour is not None and end_hour is not None:
            start_hour = _period_hour(start_hour, period, text)
            end_hour = _period_hour(end_hour, period, text)
            if end_hour < start_hour and period is None:
                end_hour = (end_hour + 12) % 24
            return TimeSpan(
                start_hour, 0, end_hour=end_hour, end_minute=0,
                text=separated.group(0), confidence=0.3, period=period,
            )

    # 3) 四五点 / 两三点 (two adjacent Chinese digits before 点)
    compact = re.search(
        rf"(?:{PERIOD_PATTERN}\s*)?([一二两三四五六七八九])([一二两三四五六七八九])\s*点",
        text,
    )
    if compact:
        period = compact.group(1) or _nearest_period(text, compact.start())
        start_hour = _cn_number(compact.group(2))
        end_hour = _cn_number(compact.group(3))
        if start_hour is not None and end_hour is not None:
            start_hour = _period_hour(start_hour, period, text)
            end_hour = _period_hour(end_hour, period, text)
            return TimeSpan(
                start_hour, 0, end_hour=end_hour, end_minute=0,
                text=compact.group(0), confidence=0.28, period=period,
            )

    # 4) 下午3点 / 三点半 / 晚上8点
    single = re.search(
        rf"(?:{PERIOD_PATTERN}\s*)?([0-9]{{1,2}}|[一二两三四五六七八九十]{{1,3}})\s*[点时]({MINUTE_PATTERN})?",
        text,
    )
    if single:
        period = single.group(1) or _nearest_period(text, single.start())
        hour = _cn_number(single.group(2))
        if hour is not None:
            hour = _period_hour(hour, period, text)
            minute = _minute_value(single.group(3))
            return TimeSpan(hour, minute, text=single.group(0), confidence=0.3, period=period)

    # 5) only a period word, e.g. "明天下午有个会"
    period_match = re.search(PERIOD_PATTERN, text)
    if period_match:
        period = period_match.group(1)
        return TimeSpan(PERIOD_DEFAULT.get(period, 9), 0, text=period, confidence=0.12, period=period)

    return TimeSpan(None, text=None, confidence=0.0)


def _find_end_time(text: str, start_hour: int, start_minute: int, start_period: str | None) -> TimeSpan | None:
    patterns = [
        re.compile(
            rf"(?:结束(?:时间)?|收尾|散会|到|至|一直到)(?:大概|大约|差不多|就是|是|在|定在|约)?\s*"
            rf"(?:{PERIOD_PATTERN}\s*)?([0-9]{{1,2}}|[一二两三四五六七八九十]{{1,3}})\s*[点时](?:{MINUTE_PATTERN})?"
        ),
        re.compile(
            rf"(?:{PERIOD_PATTERN}\s*)?([0-9]{{1,2}}|[一二两三四五六七八九十]{{1,3}})\s*[点时](?:{MINUTE_PATTERN})?\s*(?:结束|收尾|散会|完)"
        ),
    ]
    for pattern in patterns:
        match = pattern.search(text)
        if not match:
            continue
        period = match.group(1) or _nearest_period(text, match.start())
        hour = _cn_number(match.group(2))
        if hour is None:
            continue
        minute = _minute_value(match.group(3))
        if period:
            hour = _period_hour(hour, period, text)
        elif hour < 12 and (start_hour >= 12 or start_period in ("下午", "傍晚", "晚上", "夜里")):
            hour += 12
        elif hour <= start_hour and hour + 12 <= 23:
            hour += 12
        return TimeSpan(hour, minute, text=match.group(0), confidence=0.25, period=period)
    return None


def _find_duration(text: str) -> tuple[timedelta, str | None, float]:
    # "提前 30 分钟提醒" is a reminder offset, not the event duration.
    duration_source = re.sub(r"(?:提前|提早)\s*[0-9一二两三四五六七八九十]+\s*分钟(?:提醒)?", " ", text)
    if "一个半小时" in duration_source or "1个半小时" in duration_source:
        return timedelta(minutes=90), "一个半小时", 0.08
    if "半小时" in duration_source:
        return timedelta(minutes=30), "半小时", 0.08
    text = duration_source
    match = re.search(r"(\d+(?:\.\d+)?)\s*个?\s*(小时|钟头)", text)
    if match:
        return timedelta(hours=float(match.group(1))), match.group(0), 0.08
    match = re.search(r"([一二两三四五六七八九十]+)\s*个?\s*(小时|钟头)", text)
    if match:
        number = _cn_number(match.group(1))
        if number:
            return timedelta(hours=number), match.group(0), 0.08
    match = re.search(r"(\d+)\s*分钟", text)
    if match:
        return timedelta(minutes=int(match.group(1))), match.group(0), 0.06
    match = re.search(r"([一二两三四五六七八九十]+)\s*分钟", text)
    if match:
        number = _cn_number(match.group(1))
        if number:
            return timedelta(minutes=number), match.group(0), 0.06
    match = re.search(r"(\d+)\s*(天|日)", text)
    if match:
        return timedelta(days=int(match.group(1))), match.group(0), 0.06
    return timedelta(hours=1), None, 0.0


def _find_location(text: str) -> tuple[str | None, str | None]:
    explicit = re.search(r"地点[:：]\s*([\u4e00-\u9fa5A-Za-z0-9·]{1,20})", text)
    if explicit:
        return explicit.group(1), explicit.group(0)
    match = re.search(
        r"(?:在|去|到|前往|飞往)([\u4e00-\u9fa5A-Za-z0-9·]{1,12}?)(?=(?:[，,。；;\s]|开会|吃饭|玩|旅行|出差|学习|复习|看书|工作|上课|考试|见|看|买|逛|跑步|健身|$))",
        text,
    )
    if match:
        candidate = match.group(1)
        if re.fullmatch(r"[0-9一二两三四五六七八九十]{1,3}[点时].*", candidate):
            return None, None
        return candidate, match.group(0)
    return None, None


def _detect_type(text: str) -> EventType:
    if "并行" in text or "一边" in text:
        return EventType.CONTAINER
    for event_type, words in TYPE_WORDS.items():
        if any(word in text for word in words):
            return event_type
    return EventType.NORMAL


def _detect_priority(text: str) -> Priority:
    if any(word in text for word in ("重要", "紧急", "高优", "优先级高", "必须", "一定")):
        return Priority.HIGH
    if any(word in text for word in ("不急", "随意", "低优")):
        return Priority.LOW
    return Priority.MEDIUM


def _clean_title(text: str, matched: list[str], location: str | None) -> str:
    result = text
    location_tokens = {
        location,
        f"在{location}" if location else None,
        f"去{location}" if location else None,
    }
    for token in sorted(set(matched), key=len, reverse=True):
        if token and token not in location_tokens:
            result = result.replace(token, " ")
    result = re.sub(r"(优先级高|优先级低|优先高|优先低|提前.*?提醒)", " ", result)
    result = re.sub(r"(大概是|大约|差不多|可能|应该是|应该|就是|然后|一般|通常|平常|左右|前后|吧|这样子|这样吧|这样|的样子)", " ", result)
    result = re.sub(r"[，,。；;.!！?？：:]+", " ", result)
    result = re.sub(r"\s+", " ", result).strip()
    result = re.sub(r"^(的|地|得)\s*", "", result)
    result = _strip_fillers(result)
    result = re.sub(r"^(开始|结束|收尾)\s+", "", result).strip()
    result = re.sub(r"\s+(开始|结束|收尾)$", "", result).strip()
    # A leading period is context, not part of the title ("下午有个会").
    result = re.sub(rf"^(?:{PERIOD_PATTERN})\s*(?=有个|有一个|有|要|去|在|的)", "", result)
    result = re.sub(r"^有个", "", result).strip()
    if location and result.startswith("在" + location):
        result = result[len(location) + 1:].strip()
    if result in ("会", "一个会"):
        result = "开会"
    elif result in ("会议", "一个会议"):
        result = "会议"
    elif result in ("开始", "结束", "开始 结束", "开始结束", "收尾"):
        result = "新安排"
    if not result:
        result = "新安排"
    return result[:200]


def parse_sentence(text: str, now: datetime | None = None) -> NlpDraftOut:
    now = now or datetime.now()
    text = (text or "").strip()
    if not text:
        return NlpDraftOut(
            title="新安排",
            start_at=now.replace(second=0, microsecond=0) + timedelta(hours=1),
            end_at=now.replace(second=0, microsecond=0) + timedelta(hours=2),
            type=EventType.NORMAL,
            priority=Priority.MEDIUM,
            location=None,
            notes="",
            confidence=0.1,
            matches=[],
        )

    matched: list[str] = []
    target_date, date_text, date_confidence = _find_date(text, now)
    if date_text:
        matched.append(date_text)
    time_info = _find_time(text)
    if time_info.text:
        matched.append(time_info.text)
    hour, minute = time_info.hour, time_info.minute
    end_info = _find_end_time(text, hour or 9, minute, time_info.period)
    if end_info and end_info.text and (not time_info.text or end_info.text not in time_info.text):
        matched.append(end_info.text)

    duration_input = text
    for token in (date_text, time_info.text, end_info.text if end_info else None):
        if token:
            duration_input = duration_input.replace(token, " ")
    duration, duration_text, duration_confidence = _find_duration(duration_input)
    if duration_text:
        matched.append(duration_text)
    location, location_text = _find_location(text)
    if location_text:
        matched.append(location_text)
    priority = _detect_priority(text)
    event_type = _detect_type(text)

    # If no date was stated and the parsed time already passed, move to tomorrow.
    if date_text is None and hour is not None:
        candidate = datetime.combine(target_date, time(hour, minute))
        if candidate <= now:
            target_date = target_date + timedelta(days=1)

    if hour is None:
        if date_text is None:
            # Quick add without a time: next whole hour, or tomorrow morning late at night.
            base = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            if base.hour >= 22:
                target_date = target_date + timedelta(days=1)
                hour = 9
                minute = 0
            else:
                hour = base.hour
                minute = 0
        else:
            hour, minute = 9, 0

    start = datetime.combine(target_date, time(hour, minute))
    if event_type == EventType.GOAL:
        end = None
    elif end_info is not None:
        end = datetime.combine(target_date, time(end_info.hour, end_info.minute))
        if end <= start:
            end = end + timedelta(days=1)
    elif time_info.end_hour is not None:
        end = datetime.combine(target_date, time(time_info.end_hour, time_info.end_minute or 0))
        if end <= start:
            end = end + timedelta(days=1)
    else:
        end = start + duration
        if end <= start:
            end = start + timedelta(hours=1)

    title = _clean_title(text, matched, location)

    confidence = 0.42 + date_confidence + time_info.confidence + duration_confidence
    if end_info:
        confidence += 0.08
    if time_info.end_hour is not None:
        confidence += 0.04
    if len(title) > 1:
        confidence += 0.08
    if priority != Priority.MEDIUM:
        confidence += 0.05
    confidence = min(0.98, round(confidence, 2))

    return NlpDraftOut(
        title=title,
        start_at=start,
        end_at=end,
        type=event_type,
        priority=priority,
        location=location,
        notes=text,
        confidence=confidence,
        matches=matched,
    )
