package com.smartplanner.controller;

import com.smartplanner.dto.PresenceHeartbeatRequest;
import com.smartplanner.dto.PresenceHeartbeatResponse;
import com.smartplanner.service.PresenceService;
import com.smartplanner.service.ReminderService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api")
public class ReminderController {

    private final PresenceService presenceService;
    private final ReminderService reminderService;
    private final Clock clock;

    public ReminderController(PresenceService presenceService, ReminderService reminderService, Clock clock) {
        this.presenceService = presenceService;
        this.reminderService = reminderService;
        this.clock = clock;
    }

    @PostMapping("/presence/heartbeat")
    public PresenceHeartbeatResponse heartbeat(@Valid @RequestBody PresenceHeartbeatRequest request) {
        boolean userActive = presenceService.heartbeat(
                request.sessionId(), request.active(), request.visible()
        );
        ReminderService.ReminderBatch batch = reminderService.due(userActive);
        return new PresenceHeartbeatResponse(
                userActive,
                LocalDateTime.now(clock).withNano(0),
                batch.reminders(),
                batch.suppressedStrong()
        );
    }

}
