package com.smartplanner.dto;

import java.util.List;

public record HolidayCalendarDto(
        int year,
        String region,
        boolean available,
        List<HolidayDto> holidays
) {
}
