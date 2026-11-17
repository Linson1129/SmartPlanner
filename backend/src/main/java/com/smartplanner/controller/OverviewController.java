package com.smartplanner.controller;

import com.smartplanner.dto.OverviewDto;
import com.smartplanner.service.OverviewService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/overview")
public class OverviewController {

    private final OverviewService overviewService;
    private final Clock clock;

    public OverviewController(OverviewService overviewService, Clock clock) {
        this.overviewService = overviewService;
        this.clock = clock;
    }

    @GetMapping
    public OverviewDto overview(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate target = date != null ? date : LocalDate.now(clock);
        return overviewService.overview(target);
    }
}
