package com.smartplanner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PresenceHeartbeatRequest(
        @NotBlank @Size(max = 80) String sessionId,
        boolean active,
        boolean visible
) {
}
