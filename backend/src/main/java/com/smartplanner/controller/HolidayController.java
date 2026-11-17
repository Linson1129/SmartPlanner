package com.smartplanner.controller;

import com.smartplanner.domain.UserProfile;
import com.smartplanner.dto.HolidayCalendarDto;
import com.smartplanner.service.HolidayService;
import com.smartplanner.service.ProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/holidays")
public class HolidayController {

    private final HolidayService holidayService;
    private final ProfileService profileService;
    private final Clock clock;

    public HolidayController(HolidayService holidayService, ProfileService profileService, Clock clock) {
        this.holidayService = holidayService;
        this.profileService = profileService;
        this.clock = clock;
    }

    @GetMapping
    public HolidayCalendarDto calendar(@RequestParam(required = false) Integer year) {
        UserProfile profile = profileService.getOrCreate();
        int targetYear = year != null ? year : LocalDate.now(clock).getYear();
        return holidayService.calendar(targetYear, profile.getHolidayRegion());
    }
}
