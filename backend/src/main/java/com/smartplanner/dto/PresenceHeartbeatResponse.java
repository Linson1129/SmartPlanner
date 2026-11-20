package com.smartplanner.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PresenceHeartbeatResponse(
        boolean active,
        LocalDateTime serverTime,
        List<ReminderDto> reminders,
        int suppressedStrong
) {
}
