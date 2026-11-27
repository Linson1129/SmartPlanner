package com.smartplanner.controller;

import com.smartplanner.domain.WeatherProvince;
import com.smartplanner.dto.WeatherDto;
import com.smartplanner.service.WeatherService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;
    private final Clock clock;

    public WeatherController(WeatherService weatherService, Clock clock) {
        this.weatherService = weatherService;
        this.clock = clock;
    }

    @GetMapping
    public WeatherDto forecast(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "MACAU") WeatherProvince province
    ) {
        LocalDate start = from != null ? from : LocalDate.now(clock);
        LocalDate end = to != null ? to : start.plusDays(6);
        return weatherService.forecast(start, end, province);
    }
}
