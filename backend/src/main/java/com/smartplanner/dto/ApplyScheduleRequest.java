package com.smartplanner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ApplyScheduleRequest(
        @NotEmpty(message = "没有可应用的调整")
        List<@Valid Change> changes,

        Long anchorEventId
) {

    public record Change(
            @NotNull Long eventId,
            @NotNull java.time.LocalDateTime startAt,
            @NotNull java.time.LocalDateTime endAt
    ) {
    }
}
