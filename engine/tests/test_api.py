from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_holidays_for_macao_include_december():
    response = client.get("/holidays", params={"year": 2026, "region": "MO"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["region"] == "MO"
    dates = {entry["date"]: entry["name"] for entry in payload["holidays"]}
    assert dates["2026-12-08"] == "圣母无原罪瞻礼"
    assert "2026-11-02" in dates


def test_holidays_for_mainland_include_spring_festival():
    response = client.get("/holidays", params={"year": 2026, "region": "CN"})
    payload = response.json()
    dates = {entry["date"] for entry in payload["holidays"]}
    assert "2026-02-17" in dates
    assert "2026-10-01" in dates


def test_analyze_endpoint_returns_camel_case_payload():
    response = client.post(
        "/analyze",
        json={
            "candidate": {
                "id": 100,
                "title": "深度工作",
                "type": "NORMAL",
                "priority": "HIGH",
                "status": "PLANNED",
                "startAt": "2026-11-05T14:00:00",
                "endAt": "2026-11-05T15:00:00",
            },
            "events": [
                {
                    "id": 2,
                    "title": "会议",
                    "type": "NORMAL",
                    "priority": "MEDIUM",
                    "status": "PLANNED",
                    "startAt": "2026-11-05T14:30:00",
                    "endAt": "2026-11-05T15:30:00",
                }
            ],
            "profile": {"holidayMode": "SOFT", "holidayRegion": "MO"},
            "now": "2026-11-05T09:00:00",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["engineAvailable"] is True
    assert len(payload["conflicts"]) == 1
    assert payload["conflicts"][0]["overlapMinutes"] == 30
    assert payload["suggestions"]
    assert payload["suggestions"][0]["changes"]
    assert "generatedAt" in payload
