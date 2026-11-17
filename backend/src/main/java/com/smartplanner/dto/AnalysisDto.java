package com.smartplanner.dto;

import com.smartplanner.domain.EventType;
import com.smartplanner.domain.HolidayMode;

import java.time.LocalDateTime;
import java.util.List;

public record AnalysisDto(
        boolean engineAvailable,
        String engineMessage,
        List<ConflictDto> conflicts,
        List<HolidayWarningDto> holidayWarnings,
        String deadlineWarning,
        List<SuggestionDto> suggestions,
        LocalDateTime generatedAt
) {

    public record ConflictDto(
            Long eventId,
            String title,
            EventType type,
            LocalDateTime startAt,
            LocalDateTime endAt,
            int overlapMinutes
    ) {
    }

    public record HolidayWarningDto(
            String date,
            String name,
            HolidayMode mode,
            String message
    ) {
    }

    public record ChangeDto(
            Long eventId,
            String title,
            LocalDateTime startAt,
            LocalDateTime endAt,
            LocalDateTime previousStartAt,
            LocalDateTime previousEndAt
    ) {
    }

    public record SuggestionDto(
            String id,
            String strategy,
            String label,
            String reason,
            String impact,
            List<ChangeDto> changes
    ) {
    }

    public static AnalysisDto unavailable(String message) {
        return new AnalysisDto(false, message, List.of(), List.of(), null, List.of(), null);
    }
}
