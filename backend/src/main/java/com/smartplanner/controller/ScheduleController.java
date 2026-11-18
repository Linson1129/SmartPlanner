package com.smartplanner.controller;

import com.smartplanner.dto.ApplyScheduleRequest;
import com.smartplanner.dto.ApplyScheduleResponse;
import com.smartplanner.service.EventService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final EventService eventService;

    public ScheduleController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping("/apply")
    public ApplyScheduleResponse apply(@Valid @RequestBody ApplyScheduleRequest request) {
        return eventService.apply(request);
    }
}
