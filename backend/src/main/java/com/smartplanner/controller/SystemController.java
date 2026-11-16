package com.smartplanner.controller;

import com.smartplanner.dto.SystemStatusDto;
import com.smartplanner.service.EngineClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final EngineClient engineClient;
    private final Clock clock;

    public SystemController(EngineClient engineClient, Clock clock) {
        this.engineClient = engineClient;
        this.clock = clock;
    }

    @GetMapping("/status")
    public SystemStatusDto status() {
        boolean healthy = engineClient.isHealthy();
        return new SystemStatusDto(
                "ok",
                healthy,
                healthy ? null : "排期引擎未连接，日程增删改查仍可用",
                LocalDateTime.now(clock).withNano(0),
                2026
        );
    }
}
