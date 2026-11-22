from datetime import datetime

from fastapi.testclient import TestClient

from app.main import app
from app.nlp import parse_sentence

NOW = datetime(2026, 11, 6, 9, 0)


def test_meeting_with_priority_and_reminder_offset():
    draft = parse_sentence("明天下午3点和队友开会，优先级高，提前30分钟提醒", NOW)
    assert draft.title == "和队友开会"
    assert draft.start_at == datetime(2026, 11, 7, 15, 0)
    assert draft.end_at == datetime(2026, 11, 7, 16, 0)
    assert draft.priority.value == "HIGH"
    assert "明天" in draft.matches
    assert "下午3点" in draft.matches


def test_trip_location_and_morning():
    draft = parse_sentence("明天早上坐飞机要去杭州玩", NOW)
    assert draft.start_at == datetime(2026, 11, 7, 8, 0)
    assert draft.location == "杭州"
    assert "杭州" in draft.title
    assert draft.end_at == datetime(2026, 11, 7, 9, 0)


def test_duration_and_explicit_date_are_not_confused():
    draft = parse_sentence("11月10日 14:30 和导师讨论", NOW)
    assert draft.start_at == datetime(2026, 11, 10, 14, 30)
    assert draft.end_at == datetime(2026, 11, 10, 15, 30)
    assert draft.title == "和导师讨论"


def test_two_hour_work_session():
    draft = parse_sentence("后天晚上8点在图书馆复习2小时", NOW)
    assert draft.start_at == datetime(2026, 11, 8, 20, 0)
    assert draft.end_at == datetime(2026, 11, 8, 22, 0)
    assert draft.location == "图书馆"
    assert draft.title == "复习"


def test_next_monday_health_check_is_important():
    draft = parse_sentence("下周一上午10点体检", NOW)
    assert draft.start_at == datetime(2026, 11, 9, 10, 0)
    assert draft.type.value == "IMPORTANT"


def test_tonight_and_chinese_clock():
    draft = parse_sentence("今晚8点看电影", NOW)
    assert draft.start_at == datetime(2026, 11, 6, 20, 0)
    draft = parse_sentence("下午三点喝咖啡", NOW)
    assert draft.start_at == datetime(2026, 11, 6, 15, 0)
    assert draft.type.value == "CASUAL"


def test_ninety_minutes_and_filler_stripped():
    draft = parse_sentence("一个半小时的健身", NOW)
    assert draft.title == "健身"
    assert draft.end_at - draft.start_at == __import__("datetime").timedelta(minutes=90)


def test_parallel_sentence_becomes_container():
    draft = parse_sentence("一边洗衣服一边午睡", NOW)
    assert draft.type.value == "CONTAINER"


def test_nlp_endpoint_accepts_camel_case():
    client = TestClient(app)
    response = client.post(
        "/nlp/parse",
        json={"text": "明天下午3点和队友开会", "now": "2026-11-06T09:00:00"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "和队友开会"
    assert payload["startAt"] == "2026-11-07T15:00:00"
    assert payload["priority"] == "MEDIUM"


def test_colloquial_meeting_with_approximate_range_and_explicit_end():
    draft = parse_sentence(
        "我明天下午有个会，大概是晚上四五点吧然后一般结束时间就是6点这样子",
        NOW,
    )
    assert draft.title == "开会"
    assert draft.start_at == datetime(2026, 11, 7, 16, 0)
    assert draft.end_at == datetime(2026, 11, 7, 18, 0)
    assert draft.location is None
    assert "明天" in draft.matches
    assert "晚上四五点" in draft.matches
    assert "结束时间就是6点" in draft.matches


def test_compact_hour_range_in_the_afternoon():
    draft = parse_sentence("明天下午4-6点开会", NOW)
    assert draft.title == "开会"
    assert draft.start_at == datetime(2026, 11, 7, 16, 0)
    assert draft.end_at == datetime(2026, 11, 7, 18, 0)
    assert draft.location is None


def test_start_time_point_and_explicit_end_phrase():
    draft = parse_sentence("明天下午4点到6点开会", NOW)
    assert draft.start_at == datetime(2026, 11, 7, 16, 0)
    assert draft.end_at == datetime(2026, 11, 7, 18, 0)
    assert draft.title == "开会"
    assert draft.location is None


def test_start_and_end_without_a_title_subject():
    draft = parse_sentence("明天下午4点开始，6点结束", NOW)
    assert draft.start_at == datetime(2026, 11, 7, 16, 0)
    assert draft.end_at == datetime(2026, 11, 7, 18, 0)
    assert draft.title == "新安排"


def test_nlp_endpoint_accepts_colloquial_meeting():
    client = TestClient(app)
    response = client.post(
        "/nlp/parse",
        json={
            "text": "我明天下午有个会，大概是晚上四五点吧然后一般结束时间就是6点这样子",
            "now": "2026-11-06T09:00:00",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "开会"
    assert payload["startAt"] == "2026-11-07T16:00:00"
    assert payload["endAt"] == "2026-11-07T18:00:00"
