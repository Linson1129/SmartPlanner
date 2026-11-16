package com.smartplanner.service;

import com.smartplanner.domain.ScheduleEvent;
import com.smartplanner.dto.EventDto;
import com.smartplanner.repository.ScheduleEventRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class EventMapper {

    private final ScheduleEventRepository repository;

    public EventMapper(ScheduleEventRepository repository) {
        this.repository = repository;
    }

    public EventDto toDto(ScheduleEvent event) {
        String parentTitle = null;
        if (event.getParentId() != null) {
            parentTitle = repository.findById(event.getParentId())
                    .map(ScheduleEvent::getTitle)
                    .orElse(null);
        }
        return build(event, parentTitle);
    }

    public List<EventDto> toDtos(List<ScheduleEvent> events) {
        Set<Long> parentIds = events.stream()
                .map(ScheduleEvent::getParentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> parentTitles = parentIds.isEmpty()
                ? Map.of()
                : repository.findAllById(parentIds).stream()
                        .collect(Collectors.toMap(ScheduleEvent::getId, ScheduleEvent::getTitle, (a, b) -> a));
        return events.stream()
                .map(event -> build(event, event.getParentId() == null ? null : parentTitles.get(event.getParentId())))
                .toList();
    }

    public Map<Long, EventDto> byId(List<ScheduleEvent> events) {
        return toDtos(events).stream().collect(Collectors.toMap(EventDto::id, Function.identity()));
    }

    private EventDto build(ScheduleEvent event, String parentTitle) {
        return new EventDto(
                event.getId(),
                event.getTitle(),
                event.getNotes(),
                event.getType(),
                event.getPriority(),
                event.getStatus(),
                event.getStartAt(),
                event.getEndAt(),
                event.getDueAt(),
                event.getParentId(),
                parentTitle,
                event.getLocation(),
                event.isGoalCompleted(),
                event.isWeatherSensitive(),
                event.getLookaheadDays(),
                event.getCompletedAt(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }
}
