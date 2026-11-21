from datetime import date

import httpx

from app import weather
from app.weather import condition_for, fetch_weather, is_rainy, is_snowy, is_stormy


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def fake_payload():
    return {
        "daily": {
            "time": ["2026-11-06", "2026-11-07"],
            "weather_code": [0, 63],
            "temperature_2m_max": [26.4, 23.1],
            "temperature_2m_min": [19.0, 18.2],
            "precipitation_probability_max": [5, 80],
            "wind_speed_10m_max": [12.0, 24.4],
        }
    }


def test_weather_codes_and_flags():
    assert condition_for(0) == "晴"
    assert condition_for(63) == "中雨"
    assert is_rainy(63)
    assert not is_snowy(63)
    assert is_stormy(95)


def test_fetch_weather_maps_daily_forecast(monkeypatch):
    weather._cache.clear()
    monkeypatch.setattr(weather.httpx, "get", lambda *args, **kwargs: FakeResponse(fake_payload()))
    payload = fetch_weather(
        date(2026, 11, 6),
        date(2026, 11, 7),
        latitude=22.1987,
        longitude=113.5439,
    )
    assert payload["available"] is True
    assert payload["days"][0]["condition"] == "晴"
    assert payload["days"][1]["precipitationProbability"] == 80
    assert payload["days"][1]["rainy"] is True


def test_fetch_weather_degrades_gracefully(monkeypatch):
    weather._cache.clear()

    def boom(*args, **kwargs):
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(weather.httpx, "get", boom)
    payload = fetch_weather(date(2026, 12, 1), date(2026, 12, 2))
    assert payload["available"] is False
    assert payload["days"] == []
    assert "暂不可用" in payload["message"]
