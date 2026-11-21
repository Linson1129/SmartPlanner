"""Weather adapter for the scheduling engine.

Uses Open-Meteo (no API key) and a small in-process cache. If the network or the
provider is unavailable the response is marked unavailable so the calendar
keeps working. The Java API only exposes this through its own endpoint; the
browser never talks to the provider directly.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

import httpx

logger = logging.getLogger("smartplanner.weather")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 30 * 60
MAX_DAYS = 15

# WMO weather interpretation codes used by Open-Meteo.
WEATHER_CODES: dict[int, str] = {
    0: "晴",
    1: "大致晴朗",
    2: "局部多云",
    3: "多云",
    45: "有雾",
    48: "雾凇",
    51: "小毛毛雨",
    53: "毛毛雨",
    55: "强毛毛雨",
    56: "轻微冻雨",
    57: "强冻雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "轻微冻雨",
    67: "强冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "局部阵雨",
    81: "中阵雨",
    82: "强阵雨",
    85: "局部阵雪",
    86: "强阵雪",
    95: "雷暴",
    96: "雷暴伴小冰雹",
    99: "雷暴伴强冰雹",
}

RAIN_CODES = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99}
SNOW_CODES = {71, 73, 75, 77, 85, 86}
STORM_CODES = {95, 96, 99}


@dataclass
class _CacheEntry:
    created_at: float
    payload: dict[str, Any]


_cache: dict[str, _CacheEntry] = {}


def condition_for(code: int) -> str:
    return WEATHER_CODES.get(code, "未知天气")


def is_rainy(code: int) -> bool:
    return code in RAIN_CODES


def is_snowy(code: int) -> bool:
    return code in SNOW_CODES


def is_stormy(code: int) -> bool:
    return code in STORM_CODES


def _cache_key(
    start: date,
    end: date,
    latitude: float,
    longitude: float,
    timezone: str,
) -> str:
    return f"{start.isoformat()}:{end.isoformat()}:{latitude:.4f}:{longitude:.4f}:{timezone}"


def _unavailable(
    start: date,
    end: date,
    latitude: float,
    longitude: float,
    timezone: str,
    city: str,
    message: str,
) -> dict[str, Any]:
    return {
        "available": False,
        "city": city,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "days": [],
        "message": message,
        "fetchedAt": datetime.now().isoformat(timespec="seconds"),
        "range": {"from": start.isoformat(), "to": end.isoformat()},
    }


def fetch_weather(
    start: date,
    end: date,
    *,
    latitude: float = 22.1987,
    longitude: float = 113.5439,
    timezone: str = "Asia/Macau",
    city: str = "澳门",
) -> dict[str, Any]:
    if end < start:
        end = start
    if (end - start).days + 1 > MAX_DAYS:
        end = start + timedelta(days=MAX_DAYS - 1)

    key = _cache_key(start, end, latitude, longitude, timezone)
    cached = _cache.get(key)
    if cached and time.time() - cached.created_at < CACHE_TTL_SECONDS:
        return cached.payload

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        "timezone": timezone,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }
    try:
        response = httpx.get(OPEN_METEO_URL, params=params, timeout=5.0)
        response.raise_for_status()
        payload = response.json()
        daily = payload.get("daily") or {}
        dates = daily.get("time") or []
        codes = daily.get("weather_code") or []
        temp_max = daily.get("temperature_2m_max") or []
        temp_min = daily.get("temperature_2m_min") or []
        rain = daily.get("precipitation_probability_max") or []
        wind = daily.get("wind_speed_10m_max") or []
        days: list[dict[str, Any]] = []
        for index, day in enumerate(dates):
            code = int(codes[index]) if index < len(codes) and codes[index] is not None else -1
            days.append(
                {
                    "date": day,
                    "code": code,
                    "condition": condition_for(code),
                    "tempMax": _round(temp_max[index] if index < len(temp_max) else None),
                    "tempMin": _round(temp_min[index] if index < len(temp_min) else None),
                    "precipitationProbability": _round(rain[index] if index < len(rain) else None),
                    "windSpeedMax": _round(wind[index] if index < len(wind) else None),
                    "rainy": is_rainy(code),
                    "snowy": is_snowy(code),
                    "stormy": is_stormy(code),
                }
            )
        result = {
            "available": bool(days),
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
            "days": days,
            "message": None if days else "天气服务没有返回这段时间的预报",
            "fetchedAt": datetime.now().isoformat(timespec="seconds"),
            "range": {"from": start.isoformat(), "to": end.isoformat()},
        }
        _cache[key] = _CacheEntry(time.time(), result)
        return result
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        logger.warning("weather provider unavailable: %s", exc)
        return _unavailable(
            start,
            end,
            latitude,
            longitude,
            timezone,
            city,
            "天气服务暂不可用，日程功能不受影响",
        )


def _round(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None
