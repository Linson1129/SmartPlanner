package com.smartplanner.dto;

import java.util.List;

public record WeatherDto(
        boolean available,
        String city,
        double latitude,
        double longitude,
        String timezone,
        List<Day> days,
        String message,
        String fetchedAt
) {
    public record Day(
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
}
