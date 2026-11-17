from __future__ import annotations

import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query

from .holidays import holidays_for_year
from .models import (
    AnalysisOut,
    AnalyzeRequest,
    HealthResponse,
    HolidayEntryOut,
    HolidayRegion,
    HolidayResponse,
)
from .rules import analyze

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("smartplanner.engine")

app = FastAPI(
    title="SmartPlanner Scheduling Engine",
    version="0.1.0",
    description="Conflict detection, holiday awareness and assisted rescheduling.",
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


@app.get("/meta")
def meta() -> dict[str, object]:
    return {
        "service": "smartplanner-engine",
        "version": "0.1.0",
        "calendarYear": 2026,
        "features": ["holidays", "conflicts", "reschedule"],
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }
