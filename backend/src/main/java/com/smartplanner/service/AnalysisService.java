package com.smartplanner.service;

import com.smartplanner.common.EngineUnavailableException;
import com.smartplanner.domain.ScheduleEvent;
import com.smartplanner.domain.UserProfile;
import com.smartplanner.dto.AnalysisDto;
import com.smartplanner.dto.EngineDtos;
import com.smartplanner.repository.ScheduleEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    private final ScheduleEventRepository repository;
    private final ProfileService profileService;
    private final EngineClient engineClient;
    private final Clock clock;

    public AnalysisService(
            ScheduleEventRepository repository,
            ProfileService profileService,
            EngineClient engineClient,
            Clock clock
    ) {
        this.repository = repository;
        this.profileService = profileService;
        this.engineClient = engineClient;
        this.clock = clock;
    }

    public AnalysisDto analyze(ScheduleEvent candidate) {
        LocalDateTime now = LocalDateTime.now(clock).withNano(0);
        LocalDateTime end = candidate.getEndAt() != null ? candidate.getEndAt() : now;
        if (end.isBefore(candidate.getStartAt())) {
            end = candidate.getStartAt();
        }
        List<ScheduleEvent> window = repository.findOverlapping(
                ProfileService.CURRENT_USER_ID,
                candidate.getStartAt().minusDays(30),
                end.plusDays(30)
        );
        UserProfile profile = profileService.getOrCreate();
        EngineDtos.AnalyzeRequest request = new EngineDtos.AnalyzeRequest(
                toEngineEvent(candidate),
                window.stream().map(this::toEngineEvent).toList(),
                new EngineDtos.EngineProfile(
                        profile.getHolidayMode().name(),
                        profile.getHolidayRegion().name(),
                        profileService.todayExpectedFinishAt()
                ),
                now
        );
        try {
            AnalysisDto analysis = engineClient.analyze(request);
            return new AnalysisDto(
                    true,
                    null,
                    analysis.conflicts() == null ? List.of() : analysis.conflicts(),
                    analysis.holidayWarnings() == null ? List.of() : analysis.holidayWarnings(),
                    analysis.deadlineWarning(),
                    analysis.suggestions() == null ? List.of() : analysis.suggestions(),
                    analysis.generatedAt()
            );
        } catch (EngineUnavailableException ex) {
            return AnalysisDto.unavailable(ex.getMessage());
        } catch (RuntimeException ex) {
            log.error("Unexpected scheduling engine error", ex);
            return AnalysisDto.unavailable("智能排期暂时不可用，日程已保存");
        }
    }

    private EngineDtos.EngineEvent toEngineEvent(ScheduleEvent event) {
        return new EngineDtos.EngineEvent(
                event.getId(),
                event.getTitle(),
                event.getType().name(),
                event.getPriority().name(),
                event.getStatus().name(),
                event.getStartAt(),
                event.getEndAt(),
                event.getDueAt(),
                event.getParentId()
        );
    }
}
