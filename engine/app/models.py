from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class APIModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class EventType(str, Enum):
    NORMAL = "NORMAL"
    IMPORTANT = "IMPORTANT"
    CASUAL = "CASUAL"
    CONTAINER = "CONTAINER"
    GOAL = "GOAL"


class Priority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class EventStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class HolidayMode(str, Enum):
    OFF = "OFF"
    SOFT = "SOFT"
    AVOID = "AVOID"


class HolidayRegion(str, Enum):
    CN = "CN"
    MO = "MO"


def _as_local_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(ZoneInfo("Asia/Shanghai")).replace(tzinfo=None)
    return value


class EngineEvent(APIModel):
    id: int | None = None
    title: str = ""
    type: EventType = EventType.NORMAL
    priority: Priority = Priority.MEDIUM
    status: EventStatus = EventStatus.PLANNED
    start_at: datetime
    end_at: datetime | None = None
    due_at: datetime | None = None
    parent_id: int | None = None

    @field_validator("start_at", "end_at", "due_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        return _as_local_naive(value)


class ProfileIn(APIModel):
    holiday_mode: HolidayMode = HolidayMode.SOFT
    holiday_region: HolidayRegion = HolidayRegion.MO
    expected_finish_at: datetime | None = None

    @field_validator("expected_finish_at")
    @classmethod
    def normalize_expected_finish(cls, value: datetime | None) -> datetime | None:
        return _as_local_naive(value)


class AnalyzeRequest(APIModel):
    candidate: EngineEvent
    events: list[EngineEvent] = Field(default_factory=list)
    profile: ProfileIn = Field(default_factory=ProfileIn)
    now: datetime | None = None

    @field_validator("now")
    @classmethod
    def normalize_now(cls, value: datetime | None) -> datetime | None:
        return _as_local_naive(value)


class ConflictOut(APIModel):
    event_id: int
    title: str
    type: EventType
    start_at: datetime
    end_at: datetime
    overlap_minutes: int


class HolidayWarningOut(APIModel):
    date: str
    name: str
    mode: HolidayMode
    message: str


class ChangeOut(APIModel):
    event_id: int
    title: str
    start_at: datetime
    end_at: datetime
    previous_start_at: datetime
    previous_end_at: datetime | None = None


class SuggestionOut(APIModel):
    id: str
    strategy: str
    label: str
    reason: str
    impact: Literal["LOW", "MEDIUM", "HIGH"]
    changes: list[ChangeOut]


class AnalysisOut(APIModel):
    engine_available: bool = True
    conflicts: list[ConflictOut] = Field(default_factory=list)
    holiday_warnings: list[HolidayWarningOut] = Field(default_factory=list)
    deadline_warning: str | None = None
    suggestions: list[SuggestionOut] = Field(default_factory=list)
    generated_at: datetime


class HolidayEntryOut(APIModel):
    date: str
    name: str
    kind: Literal["PUBLIC_HOLIDAY", "WORKDAY"]
    region: HolidayRegion


class HolidayResponse(APIModel):
    year: int
    region: HolidayRegion
    holidays: list[HolidayEntryOut]


class HealthResponse(APIModel):
    status: str
    service: str
    version: str


class WeatherDayOut(APIModel):
    date: str
    code: int
    condition: str
    temp_max: float | None = None
    temp_min: float | None = None
    precipitation_probability: float | None = None
    wind_speed_max: float | None = None
    rainy: bool = False
    snowy: bool = False
    stormy: bool = False


class WeatherResponse(APIModel):
    available: bool
    city: str
    latitude: float
    longitude: float
    timezone: str
    days: list[WeatherDayOut] = Field(default_factory=list)
    message: str | None = None
    fetched_at: str


class NlpRequest(APIModel):
    text: str = Field(min_length=1, max_length=500)
    now: datetime | None = None

    @field_validator("now")
    @classmethod
    def normalize_now(cls, value: datetime | None) -> datetime | None:
        return _as_local_naive(value)


class NlpDraftOut(APIModel):
    title: str
    start_at: datetime
    end_at: datetime | None
    type: EventType
    priority: Priority
    location: str | None = None
    notes: str = ""
    confidence: float
    matches: list[str] = Field(default_factory=list)
