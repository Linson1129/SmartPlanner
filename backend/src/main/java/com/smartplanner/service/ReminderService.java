package com.smartplanner.service;

import com.smartplanner.domain.EventStatus;
import com.smartplanner.domain.EventType;
import com.smartplanner.domain.ReminderKind;
import com.smartplanner.domain.ReminderLog;
import com.smartplanner.domain.ReminderStrength;
import com.smartplanner.domain.ScheduleEvent;
import com.smartplanner.dto.ReminderDto;
import com.smartplanner.repository.ReminderLogRepository;
import com.smartplanner.repository.ScheduleEventRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ReminderService {

    private static final Duration DUE_WINDOW = Duration.ofMinutes(45);
    private static final DateTimeFormatter KEY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private final ScheduleEventRepository eventRepository;
    private final ReminderLogRepository logRepository;
    private final Clock clock;

    public ReminderService(
            ScheduleEventRepository eventRepository,
            ReminderLogRepository logRepository,
            Clock clock
    ) {
        this.eventRepository = eventRepository;
        this.logRepository = logRepository;
        this.clock = clock;
    }

    public ReminderBatch due(boolean userActive) {
        LocalDateTime now = LocalDateTime.now(clock).withNano(0);
        LocalDateTime from = now.minus(DUE_WINDOW);
        List<ScheduleEvent> candidates = eventRepository.findReminderCandidates(
                ProfileService.CURRENT_USER_ID, from, now
        );
        List<ReminderDto> reminders = new ArrayList<>();
        int suppressedStrong = 0;

        for (ScheduleEvent event : candidates) {
            if (event.getStatus() == EventStatus.CANCELLED) {
                continue;
            }
            for (Occurrence occurrence : occurrences(event, from, now)) {
                if (occurrence.triggerAt().isBefore(from) || occurrence.triggerAt().isAfter(now)) {
                    continue;
                }
                if (occurrence.softOnly()) {
                    if (!delivered(event, occurrence, ReminderStrength.SOFT)) {
                        deliver(event, occurrence, ReminderStrength.SOFT, reminders);
                    }
                    continue;
                }
                boolean strongAllowed = occurrence.alwaysStrong() || !userActive;
                if (strongAllowed) {
                    if (!delivered(event, occurrence, ReminderStrength.STRONG)) {
                        deliver(event, occurrence, ReminderStrength.STRONG, reminders);
                    }
                } else if (!delivered(event, occurrence, ReminderStrength.SOFT)
                        && !delivered(event, occurrence, ReminderStrength.STRONG)) {
                    deliver(event, occurrence, ReminderStrength.SOFT, reminders);
                    suppressedStrong++;
                }
            }
        }

        reminders.sort(Comparator.comparing(ReminderDto::triggerAt));
        return new ReminderBatch(reminders, suppressedStrong);
    }

    private List<Occurrence> occurrences(ScheduleEvent event, LocalDateTime from, LocalDateTime to) {
        List<Occurrence> result = new ArrayList<>();
        boolean done = event.getStatus() == EventStatus.DONE;
        boolean cancelled = event.getStatus() == EventStatus.CANCELLED;
        if (cancelled) {
            return result;
        }

        if (!done) {
            if (event.getType() == EventType.GOAL && event.isGoalCompleted()) {
                // Already converted, no start reminder.
            } else if (event.getType() == EventType.NORMAL) {
                result.add(start(event, false, false));
            } else if (event.getType() == EventType.IMPORTANT) {
                result.add(start(event, true, false));
            } else if (event.getType() == EventType.CONTAINER) {
                result.add(start(event, false, false));
            } else if (event.getType() == EventType.GOAL) {
                result.add(start(event, false, true));
            }
        }

        if (!done && event.getEndAt() != null) {
            if (event.getType() == EventType.IMPORTANT) {
                result.add(new Occurrence(
                        ReminderKind.END,
                        event.getEndAt(),
                        "END:" + key(event.getEndAt()),
                        true,
                        false,
                        "重要日程结束：" + event.getTitle(),
                        "这段重要时间已经结束，记得留一分钟收尾。"
                ));
            } else if (event.getType() == EventType.CONTAINER) {
                result.add(new Occurrence(
                        ReminderKind.END,
                        event.getEndAt(),
                        "END:" + key(event.getEndAt()),
                        true,
                        false,
                        "容器时段结束：" + event.getTitle(),
                        "这段时间结束了，来看看容器里完成了什么。"
                ));
            }
        }

        if (event.getDueAt() != null && !done && event.getType() != EventType.CASUAL) {
            result.add(new Occurrence(
                    ReminderKind.DDL,
                    event.getDueAt(),
                    "DDL:" + key(event.getDueAt()),
                    false,
                    false,
                    "截止时间到了：" + event.getTitle(),
                    "到达了你设定的截止时间。"
            ));
        }

        if (event.isGoalCompleted() && event.getCompletedAt() != null) {
            long minutes = Math.max(0, Duration.between(event.getStartAt(), event.getCompletedAt()).toMinutes());
            result.add(new Occurrence(
                    ReminderKind.GOAL_COMPLETE,
                    event.getCompletedAt(),
                    "GOAL_COMPLETE:" + key(event.getCompletedAt()),
                    true,
                    false,
                    "目标达成：" + event.getTitle(),
                    "实际投入 " + formatDuration(minutes) + "。这份坚持已经变成容器记录，随时可以回看。"
            ));
        }
        return result;
    }

    private Occurrence start(ScheduleEvent event, boolean alwaysStrong, boolean softOnly) {
        String message = switch (event.getType()) {
            case IMPORTANT -> "重要日程开始，把注意力先留给它。";
            case CONTAINER -> "容器时段开始，可以在里面并行安排子事件。";
            case GOAL -> "目标仍在进行中，完成后记得回来收尾。";
            default -> "现在开始，给这件事一段完整的时间。";
        };
        String detail = event.getEndAt() == null
                ? message
                : message + "预计 " + event.getEndAt().toLocalTime() + " 结束。";
        return new Occurrence(
                ReminderKind.START,
                event.getStartAt(),
                "START:" + key(event.getStartAt()),
                alwaysStrong,
                softOnly,
                event.getTitle(),
                detail
        );
    }

    private boolean delivered(ScheduleEvent event, Occurrence occurrence, ReminderStrength strength) {
        return logRepository.existsByEventIdAndOccurrenceKeyAndStrength(
                event.getId(), occurrence.key(), strength
        );
    }

    private void deliver(
            ScheduleEvent event,
            Occurrence occurrence,
            ReminderStrength strength,
            List<ReminderDto> sink
    ) {
        try {
            logRepository.save(new ReminderLog(
                    event.getId(), occurrence.key(), strength, LocalDateTime.now(clock)
            ));
        } catch (DataIntegrityViolationException ignored) {
            // Another heartbeat won the race; do not show a duplicate.
            return;
        }
        sink.add(new ReminderDto(
                event.getId() + ":" + occurrence.kind().name() + ":" + occurrence.key() + ":" + strength,
                event.getId(),
                occurrence.kind().name(),
                strength.name(),
                occurrence.title(),
                occurrence.message(),
                occurrence.triggerAt(),
                event.getType(),
                event.getStartAt(),
                event.getEndAt(),
                event.getDueAt()
        ));
    }

    private String key(LocalDateTime value) {
        return value.format(KEY_FORMAT);
    }

    private String formatDuration(long minutes) {
        if (minutes < 60) {
            return minutes + " 分钟";
        }
        long hours = minutes / 60;
        long rest = minutes % 60;
        return hours + " 小时" + (rest > 0 ? " " + rest + " 分钟" : "");
    }

    public record ReminderBatch(List<ReminderDto> reminders, int suppressedStrong) {
    }

    private record Occurrence(
            ReminderKind kind,
            LocalDateTime triggerAt,
            String key,
            boolean alwaysStrong,
            boolean softOnly,
            String title,
            String message
    ) {
    }
}
