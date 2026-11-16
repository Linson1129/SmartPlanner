package com.smartplanner.dto;

import com.smartplanner.domain.EventStatus;
import com.smartplanner.domain.EventType;
import com.smartplanner.domain.Priority;

import java.time.LocalDateTime;

public record EventDto(
        Long id,
        String title,
        String notes,
        EventType type,
        Priority priority,
        EventStatus status,
        LocalDateTime startAt,
        LocalDateTime endAt,
        LocalDateTime dueAt,
        Long parentId,
        String parentTitle,
        String location,
        boolean goalCompleted,
        boolean weatherSensitive,
        int lookaheadDays,
        LocalDateTime completedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
