package com.smartplanner.dto;

import com.smartplanner.domain.HolidayMode;
import com.smartplanner.domain.HolidayRegion;

import java.time.LocalDateTime;

public record ProfileDto(
        String displayName,
        String expectedFinishTime,
        LocalDateTime expectedFinishAt,
        HolidayMode holidayMode,
        HolidayRegion holidayRegion,
        int idleThresholdSeconds,
        boolean demoSeeded
) {
}
