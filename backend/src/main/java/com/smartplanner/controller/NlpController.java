package com.smartplanner.controller;

import com.smartplanner.dto.EngineDtos;
import com.smartplanner.dto.NlpParseRequest;
import com.smartplanner.service.EngineClient;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/nlp")
public class NlpController {

    private final EngineClient engineClient;
    private final Clock clock;

    public NlpController(EngineClient engineClient, Clock clock) {
        this.engineClient = engineClient;
        this.clock = clock;
    }

    @PostMapping("/parse")
    public EngineDtos.NlpDraft parse(@Valid @RequestBody NlpParseRequest request) {
        return engineClient.parseNlp(
                request.text().trim(),
                LocalDateTime.now(clock).withNano(0)
        );
    }
}
