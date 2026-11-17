package com.smartplanner.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class EngineDtos {

    private EngineDtos() {
    }

    public record EngineEvent(
            Long id,
            String title,
            String type,
            String priority,
            String status,
            LocalDateTime startAt,
            LocalDateTime endAt,
            LocalDateTime dueAt,
            Long parentId
    ) {
    }

    public record EngineProfile(
            String holidayMode,
            String holidayRegion,
            LocalDateTime expectedFinishAt
    ) {
    }

    public record AnalyzeRequest(
            EngineEvent candidate,
            List<EngineEvent> events,
            EngineProfile profile,
            LocalDateTime now
    ) {
    }

    public record HolidayEntry(String date, String name, String kind, String region) {
    }

    public record HolidayResponse(int year, String region, List<HolidayEntry> holidays) {
    }

    public record HealthResponse(String status, String service, String version) {
    }

    public record WeatherDay(
            String date,
            int code,
            String condition,
            Double tempMax,
            Double tempMin,
            Double precipitationProbability,
            Double windSpeedMax,
            boolean rainy,
            boolean snowy,
            boolean stormy
    ) {
    }

    public record WeatherResponse(
            boolean available,
            String city,
            double latitude,
            double longitude,
            String timezone,
            List<WeatherDay> days,
            String message,
            String fetchedAt
    ) {
    }

    public record NlpRequest(String text, LocalDateTime now) {
    }

    public record NlpDraft(
            String title,
            LocalDateTime startAt,
            LocalDateTime endAt,
            com.smartplanner.domain.EventType type,
            com.smartplanner.domain.Priority priority,
            String location,
            String notes,
            double confidence,
            List<String> matches
    ) {
    }
}
