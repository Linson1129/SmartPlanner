package com.smartplanner.controller;

import com.smartplanner.dto.DeleteResult;
import com.smartplanner.dto.EventDto;
import com.smartplanner.dto.EventMoveRequest;
import com.smartplanner.dto.EventSaveResponse;
import com.smartplanner.dto.EventUpsertRequest;
import com.smartplanner.service.EventService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventDto> list(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return eventService.list(from, to);
    }

    @GetMapping("/{id}")
    public EventDto get(@PathVariable Long id) {
        return eventService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventSaveResponse create(@Valid @RequestBody EventUpsertRequest request) {
        return eventService.create(request);
    }

    @PutMapping("/{id}")
    public EventSaveResponse update(@PathVariable Long id, @Valid @RequestBody EventUpsertRequest request) {
        return eventService.update(id, request);
    }

    @PatchMapping("/{id}/complete")
    public EventDto complete(@PathVariable Long id) {
        return eventService.complete(id);
    }

    @PatchMapping("/{id}/move")
    public EventSaveResponse move(@PathVariable Long id, @Valid @RequestBody EventMoveRequest request) {
        return eventService.move(id, request);
    }

    @DeleteMapping("/{id}")
    public DeleteResult delete(@PathVariable Long id) {
        return eventService.delete(id);
    }
}
