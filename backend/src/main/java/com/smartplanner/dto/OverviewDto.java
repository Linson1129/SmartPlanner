package com.smartplanner.dto;

import java.time.LocalDateTime;

public record OverviewDto(
        LocalDateTime now,
        String date,
        LocalDateTime expectedFinishAt,
        DdlDto urgentDdl,
        DdlDto nextDdl,
        int todayCount,
        int todayMinutes,
        int activeGoals,
        int completedToday,
        HolidayDto holiday
) {

    public record DdlDto(EventDto event, long minutesLeft, boolean withinExpected) {
    }
}
