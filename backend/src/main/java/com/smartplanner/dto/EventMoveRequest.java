package com.smartplanner.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record EventMoveRequest(
        @NotNull LocalDateTime startAt,
        @NotNull LocalDateTime endAt
) {
}
