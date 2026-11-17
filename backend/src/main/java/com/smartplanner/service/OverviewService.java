package com.smartplanner.service;

import com.smartplanner.domain.EventStatus;
import com.smartplanner.domain.EventType;
import com.smartplanner.domain.ScheduleEvent;
import com.smartplanner.domain.UserProfile;
import com.smartplanner.dto.EventDto;
import com.smartplanner.dto.HolidayDto;
import com.smartplanner.dto.OverviewDto;
import com.smartplanner.repository.ScheduleEventRepository;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OverviewService {

    private static final List<EventStatus> EXCLUDED = List.of(EventStatus.DONE, EventStatus.CANCELLED);

    private final ScheduleEventRepository repository;
    private final EventMapper mapper;
    private final ProfileService profileService;
    private final HolidayService holidayService;
    private final Clock clock;

    public OverviewService(
            ScheduleEventRepository repository,
            EventMapper mapper,
            ProfileService profileService,
            HolidayService holidayService,
            Clock clock
    ) {
        this.repository = repository;
        this.mapper = mapper;
        this.profileService = profileService;
        this.holidayService = holidayService;
        this.clock = clock;
    }

    public OverviewDto overview(LocalDate date) {
        LocalDateTime now = LocalDateTime.now(clock).withNano(0);
        UserProfile profile = profileService.getOrCreate();
        LocalDateTime expectedFinishAt = profileService.todayExpectedFinishAt();
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);

        List<ScheduleEvent> dayEvents = repository.findOverlapping(
                ProfileService.CURRENT_USER_ID, dayStart, dayEnd
        );
        List<ScheduleEvent> topLevel = dayEvents.stream()
                .filter(event -> event.getParentId() == null)
                .filter(event -> event.getStatus() != EventStatus.CANCELLED)
                .toList();

        int minutes = topLevel.stream()
                .filter(event -> !event.isOpenGoal())
                .filter(event -> event.getEndAt() != null)
                .mapToInt(event -> {
                    LocalDateTime start = event.getStartAt().isBefore(dayStart) ? dayStart : event.getStartAt();
                    LocalDateTime end = event.getEndAt().isAfter(dayEnd) ? dayEnd : event.getEndAt();
                    return (int) Math.max(0, Duration.between(start, end).toMinutes());
                })
                .sum();

        int completedToday = (int) topLevel.stream()
                .filter(event -> event.getStatus() == EventStatus.DONE)
                .filter(event -> event.getCompletedAt() != null)
                .filter(event -> event.getCompletedAt().toLocalDate().equals(date))
                .count();

        int activeGoals = (int) repository
                .findByUserIdAndTypeAndGoalCompletedFalse(ProfileService.CURRENT_USER_ID, EventType.GOAL)
                .stream()
                .filter(event -> !event.getStartAt().isAfter(now))
                .count();

        List<ScheduleEvent> deadlines = repository.findUpcomingDeadlines(
                        ProfileService.CURRENT_USER_ID, now, EXCLUDED
                ).stream()
                .filter(event -> event.getType() != EventType.CASUAL)
                .toList();

        OverviewDto.DdlDto urgent = null;
        OverviewDto.DdlDto next = null;
        for (ScheduleEvent deadline : deadlines) {
            boolean withinExpected = !deadline.getDueAt().isAfter(expectedFinishAt);
            OverviewDto.DdlDto ddl = new OverviewDto.DdlDto(
                    mapper.toDto(deadline),
                    Math.max(0, Duration.between(now, deadline.getDueAt()).toMinutes()),
                    withinExpected
            );
            if (urgent == null && withinExpected) {
                urgent = ddl;
            }
            if (next == null) {
                next = ddl;
            }
            if (urgent != null && next != null) {
                break;
            }
        }

        HolidayDto holiday = holidayService.holidayOn(date, profile.getHolidayRegion());
        return new OverviewDto(
                now,
                date.toString(),
                expectedFinishAt,
                urgent,
                next,
                topLevel.size(),
                minutes,
                activeGoals,
                completedToday,
                holiday
        );
    }
}
