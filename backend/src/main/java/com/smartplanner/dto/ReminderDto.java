package com.smartplanner.dto;

import com.smartplanner.domain.EventType;

import java.time.LocalDateTime;

public record ReminderDto(
        String id,
        Long eventId,
        String kind,
        String strength,
        String title,
        String message,
        LocalDateTime triggerAt,
        EventType eventType,
        LocalDateTime startAt,
        LocalDateTime endAt,
        LocalDateTime dueAt
) {
}
