package com.smartplanner.dto;

import java.time.LocalDateTime;

public record SystemStatusDto(
        String api,
        boolean engineAvailable,
        String engineMessage,
        LocalDateTime serverTime,
        int calendarYear
) {
}
