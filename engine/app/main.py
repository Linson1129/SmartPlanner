from __future__ import annotations

import logging
from datetime import date, datetime

from fastapi import FastAPI, HTTPException, Query

from .holidays import holidays_for_year
from .models import (
    AnalysisOut,
    AnalyzeRequest,
    HealthResponse,
    HolidayEntryOut,
    HolidayRegion,
    HolidayResponse,
    NlpDraftOut,
    NlpRequest,
    WeatherResponse,
)
from .nlp import parse_sentence
from .rules import analyze
from .weather import fetch_weather

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("smartplanner.engine")

app = FastAPI(
    title="SmartPlanner Scheduling Engine",
    version="0.1.0",
    description="Conflict detection, holiday awareness, weather and NLP quick-add.",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="smartplanner-engine", version="0.1.0")


@app.get("/holidays", response_model=HolidayResponse)
def holidays(
    year: int = Query(default=2026, ge=2020, le=2035),
    region: HolidayRegion = HolidayRegion.MO,
) -> HolidayResponse:
    entries = holidays_for_year(year, region.value)
    return HolidayResponse(
        year=year,
        region=region,
        holidays=[
            HolidayEntryOut(
                date=entry.date.isoformat(),
                name=entry.name,
                kind=entry.kind,
                region=entry.region,
            )
            for entry in entries
        ],
    )


@app.post("/analyze", response_model=AnalysisOut)
def analyze_endpoint(request: AnalyzeRequest) -> AnalysisOut:
    try:
        result = analyze(request)
    except Exception as exc:  # pragma: no cover - defensive boundary
        logger.exception("analysis failed")
        raise HTTPException(status_code=500, detail=f"analysis failed: {exc}") from exc
    logger.info(
        "analyzed candidate=%s conflicts=%d suggestions=%d",
        request.candidate.title,
        len(result.conflicts),
        len(result.suggestions),
    )
    return result


@app.get("/weather", response_model=WeatherResponse)
def weather(
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    latitude: float = Query(default=22.1987, ge=-90, le=90),
    longitude: float = Query(default=113.5439, ge=-180, le=180),
    timezone: str = Query(default="Asia/Macau", max_length=64),
    city: str = Query(default="澳门", max_length=60),
) -> WeatherResponse:
    if to_date < from_date:
        raise HTTPException(status_code=400, detail="weather range is invalid")
    if (to_date - from_date).days + 1 > 16:
        raise HTTPException(status_code=400, detail="weather range is limited to 15 days")
    payload = fetch_weather(
        from_date,
        to_date,
        latitude=latitude,
        longitude=longitude,
        timezone=timezone,
        city=city,
    )
    return WeatherResponse.model_validate(payload)


@app.post("/nlp/parse", response_model=NlpDraftOut)
def nlp_parse(request: NlpRequest) -> NlpDraftOut:
    return parse_sentence(request.text, request.now)


@app.get("/meta")
def meta() -> dict[str, object]:
    return {
        "service": "smartplanner-engine",
        "version": "0.1.0",
        "calendarYear": 2026,
        "features": ["holidays", "conflicts", "reschedule", "weather", "nlp"],
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }
