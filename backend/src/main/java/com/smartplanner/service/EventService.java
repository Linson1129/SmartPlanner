package com.smartplanner.service;

import com.smartplanner.common.BadRequestException;
import com.smartplanner.common.NotFoundException;
import com.smartplanner.domain.EventStatus;
import com.smartplanner.domain.EventType;
import com.smartplanner.domain.ScheduleEvent;
import com.smartplanner.dto.AnalysisDto;
import com.smartplanner.dto.ApplyScheduleRequest;
import com.smartplanner.dto.ApplyScheduleResponse;
import com.smartplanner.dto.DeleteResult;
import com.smartplanner.dto.EventDto;
import com.smartplanner.dto.EventSaveResponse;
import com.smartplanner.dto.EventUpsertRequest;
import com.smartplanner.repository.ReminderLogRepository;
import com.smartplanner.repository.ScheduleEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class EventService {

    private final ScheduleEventRepository repository;
    private final ReminderLogRepository reminderLogRepository;
    private final EventMapper mapper;
    private final AnalysisService analysisService;
    private final Clock clock;

    public EventService(
            ScheduleEventRepository repository,
            ReminderLogRepository reminderLogRepository,
            EventMapper mapper,
            AnalysisService analysisService,
            Clock clock
    ) {
        this.repository = repository;
        this.reminderLogRepository = reminderLogRepository;
        this.mapper = mapper;
        this.analysisService = analysisService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<EventDto> list(LocalDateTime from, LocalDateTime to) {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime start = from != null ? from : now.minusDays(30);
        LocalDateTime end = to != null ? to : now.plusDays(60);
        if (!end.isAfter(start)) {
            throw new BadRequestException("时间范围不正确");
        }
        return mapper.toDtos(repository.findOverlapping(ProfileService.CURRENT_USER_ID, start, end));
    }

    @Transactional(readOnly = true)
    public EventDto get(Long id) {
        return mapper.toDto(entity(id));
    }

    @Transactional
    public EventSaveResponse create(EventUpsertRequest request) {
        ScheduleEvent event = new ScheduleEvent();
        event.setUserId(ProfileService.CURRENT_USER_ID);
        event.setStatus(EventStatus.PLANNED);
        applyFields(event, request, true);
        repository.save(event);
        AnalysisDto analysis = analysisService.analyze(event);
        return new EventSaveResponse(mapper.toDto(event), analysis);
    }

    @Transactional
    public EventSaveResponse update(Long id, EventUpsertRequest request) {
        ScheduleEvent event = entity(id);
        com.smartplanner.domain.EventType previousType = event.getType();
        applyFields(event, request, false);
        if (previousType != event.getType()) {
            // The occurrence key includes the reminder kind; a type change may
            // reuse the same START/END key and would otherwise be suppressed.
            reminderLogRepository.deleteByEventId(event.getId());
        }
        repository.save(event);
        AnalysisDto analysis = analysisService.analyze(event);
        return new EventSaveResponse(mapper.toDto(event), analysis);
    }

    @Transactional
    public EventDto complete(Long id) {
        ScheduleEvent event = entity(id);
        if (event.getStatus() == EventStatus.DONE) {
            throw new BadRequestException("这条日程已经完成了");
        }
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new BadRequestException("已取消的日程不能标记完成");
        }
        LocalDateTime now = LocalDateTime.now(clock).withNano(0);
        if (event.getType() == EventType.GOAL && !event.isGoalCompleted()) {
            if (now.isBefore(event.getStartAt())) {
                throw new BadRequestException("目标还未开始，暂时不能收尾");
            }
            event.setEndAt(now);
            event.setType(EventType.CONTAINER);
            event.setGoalCompleted(true);
            event.setCompletedAt(now);
            event.setStatus(EventStatus.DONE);
        } else {
            event.setStatus(EventStatus.DONE);
            event.setCompletedAt(now);
        }
        repository.save(event);
        return mapper.toDto(event);
    }

    @Transactional
    public DeleteResult delete(Long id) {
        ScheduleEvent event = entity(id);
        List<ScheduleEvent> children = repository.findByUserIdAndParentId(ProfileService.CURRENT_USER_ID, id);
        for (ScheduleEvent child : children) {
            child.setParentId(null);
        }
        if (!children.isEmpty()) {
            repository.saveAll(children);
        }
        reminderLogRepository.deleteByEventId(id);
        repository.delete(event);
        return new DeleteResult(id, children.size());
    }

    @Transactional
    public ApplyScheduleResponse apply(ApplyScheduleRequest request) {
        Set<Long> seen = new HashSet<>();
        List<ScheduleEvent> updated = new ArrayList<>();
        for (ApplyScheduleRequest.Change change : request.changes()) {
            if (!seen.add(change.eventId())) {
                throw new BadRequestException("同一个日程不能在一次调整中出现两次");
            }
            ScheduleEvent event = entity(change.eventId());
            if (event.getType() == EventType.GOAL && event.getEndAt() == null) {
                throw new BadRequestException("进行中的目标不能通过智能排期调整结束时间");
            }
            if (event.getStatus() == EventStatus.DONE || event.getStatus() == EventStatus.CANCELLED) {
                throw new BadRequestException("已完成或已取消的日程不能重新排期");
            }
            if (!change.endAt().isAfter(change.startAt())) {
                throw new BadRequestException("调整后的结束时间必须晚于开始时间");
            }
            event.setStartAt(change.startAt());
            event.setEndAt(change.endAt());
            updated.add(event);
        }
        repository.saveAll(updated);
        Long anchorId = request.anchorEventId() != null
                ? request.anchorEventId()
                : updated.get(0).getId();
        ScheduleEvent anchor = repository.findById(anchorId)
                .orElseThrow(() -> new NotFoundException("找不到调整后的日程"));
        AnalysisDto analysis = analysisService.analyze(anchor);
        return new ApplyScheduleResponse(mapper.toDtos(updated), analysis);
    }

    public ScheduleEvent entity(Long id) {
        return repository.findById(id)
                .filter(event -> ProfileService.CURRENT_USER_ID.equals(event.getUserId()))
                .orElseThrow(() -> new NotFoundException("找不到这条日程"));
    }

    private void applyFields(ScheduleEvent event, EventUpsertRequest request, boolean creating) {
        String title = request.title() == null ? "" : request.title().trim();
        if (title.isEmpty()) {
            throw new BadRequestException("请填写事件名称");
        }
        if (request.startAt() == null) {
            throw new BadRequestException("请选择开始时间");
        }
        EventType type = request.type();
        if (type == null) {
            throw new BadRequestException("请选择事件类型");
        }
        LocalDateTime start = request.startAt().withNano(0);
        LocalDateTime end = request.endAt() == null ? null : request.endAt().withNano(0);

        if (type == EventType.GOAL) {
            if (end != null) {
                throw new BadRequestException("目标事件不需要结束时间，完成时会自动记录");
            }
            if (request.parentId() != null) {
                throw new BadRequestException("目标事件不能放进容器");
            }
        } else {
            if (end == null) {
                throw new BadRequestException("请选择结束时间");
            }
            if (!end.isAfter(start)) {
                throw new BadRequestException("结束时间必须晚于开始时间");
            }
        }

        if (type == EventType.CONTAINER && request.parentId() != null) {
            throw new BadRequestException("容器事件不能嵌套在其他容器中");
        }
        if (!creating && event.isGoalCompleted() && type != EventType.CONTAINER) {
            throw new BadRequestException("已完成的目标会保留为容器，不能改回其它类型");
        }

        boolean hasChildren = !creating
                && event.getId() != null
                && !repository.findByUserIdAndParentId(ProfileService.CURRENT_USER_ID, event.getId()).isEmpty();
        if (hasChildren && type != EventType.CONTAINER) {
            throw new BadRequestException("这个容器里还有子事件，请先移出子事件再修改类型");
        }

        if (request.parentId() != null) {
            ScheduleEvent parent = entity(request.parentId());
            if (event.getId() != null && event.getId().equals(parent.getId())) {
                throw new BadRequestException("事件不能把自己作为容器");
            }
            if (parent.getType() != EventType.CONTAINER) {
                throw new BadRequestException("只有容器事件可以容纳其它事件");
            }
            if (parent.getParentId() != null) {
                throw new BadRequestException("容器不支持多级嵌套");
            }
            if (creating || !request.parentId().equals(event.getParentId())) {
                // The child is allowed to overlap its container and its siblings.
            }
            event.setParentId(request.parentId());
        } else {
            event.setParentId(null);
        }

        event.setTitle(title);
        event.setNotes(blankToNull(request.notes()));
        event.setLocation(blankToNull(request.location()));
        event.setType(type);
        event.setPriority(request.priority() == null ? com.smartplanner.domain.Priority.MEDIUM : request.priority());
        event.setStartAt(start);
        event.setEndAt(end);
        event.setDueAt(request.dueAt() == null ? null : request.dueAt().withNano(0));

        boolean weatherSensitive = Boolean.TRUE.equals(request.weatherSensitive());
        int lookahead = request.lookaheadDays() == null ? 0 : request.lookaheadDays();
        if (lookahead < 0 || lookahead > 7) {
            throw new BadRequestException("天气预见天数需要在 0 到 7 天之间");
        }
        event.setWeatherSensitive(weatherSensitive);
        event.setLookaheadDays(weatherSensitive ? Math.max(1, lookahead) : 0);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
