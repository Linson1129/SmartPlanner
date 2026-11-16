package com.smartplanner.service;

import com.smartplanner.domain.EventStatus;
import com.smartplanner.domain.EventType;
import com.smartplanner.domain.Priority;
import com.smartplanner.domain.ScheduleEvent;
import com.smartplanner.domain.UserProfile;
import com.smartplanner.repository.ScheduleEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;

@Component
@ConditionalOnProperty(name = "smartplanner.seed.enabled", havingValue = "true", matchIfMissing = true)
public class SeedService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);

    private final ScheduleEventRepository repository;
    private final ProfileService profileService;
    private final Clock clock;

    public SeedService(
            ScheduleEventRepository repository,
            ProfileService profileService,
            Clock clock
    ) {
        this.repository = repository;
        this.profileService = profileService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserProfile profile = profileService.getOrCreate();
        if (profile.isDemoSeeded()) {
            return;
        }
        if (repository.countByUserId(ProfileService.CURRENT_USER_ID) > 0) {
            profileService.markDemoSeeded();
            return;
        }
        LocalDate today = LocalDate.now(clock);
        LocalDateTime now = LocalDateTime.now(clock);

        save(event("晨间整理", EventType.NORMAL, Priority.LOW,
                today.atTime(8, 0), today.atTime(8, 20), null, null, null,
                "把桌面和收件箱清空，给今天留一点空白。", EventStatus.DONE, today.atTime(8, 20), false));

        save(event("团队周会", EventType.IMPORTANT, Priority.HIGH,
                today.atTime(10, 0), today.atTime(11, 0), null, null, null,
                "同步本周进度，确认需求分析的分工。", EventStatus.PLANNED, null, false));

        save(event("深度工作 · 需求分析", EventType.NORMAL, Priority.HIGH,
                today.atTime(14, 0), today.atTime(15, 30), null, null, "图书馆 3F",
                "关闭通知，只做需求分析文档。", EventStatus.PLANNED, null, false));

        save(event("午后散步", EventType.CASUAL, Priority.LOW,
                today.atTime(16, 0), today.atTime(16, 30), null, null, "校园湖边",
                "随意事件：到点只会悄悄变色，不会打扰你。", EventStatus.PLANNED, null, false));

        save(event("提交需求分析报告", EventType.NORMAL, Priority.HIGH,
                today.atTime(18, 0), today.atTime(19, 0), today.atTime(21, 30), null, null,
                "DDL 21:30，留出最后的检查时间。", EventStatus.PLANNED, null, false));

        ScheduleEvent container = save(event("晚间并行 · 洗衣与拉伸", EventType.CONTAINER, Priority.MEDIUM,
                today.atTime(20, 0), today.atTime(21, 0), null, null, null,
                "容器事件：洗衣机和小憩可以同时存在，不判冲突。", EventStatus.PLANNED, null, false));
        save(event("洗衣机运行", EventType.NORMAL, Priority.LOW,
                today.atTime(20, 0), today.atTime(20, 45), null, container.getId(), null,
                "放进容器后，和拉伸重叠也不会产生冲突。", EventStatus.PLANNED, null, false));
        save(event("客厅拉伸", EventType.CASUAL, Priority.LOW,
                today.atTime(20, 10), today.atTime(20, 40), null, container.getId(), null,
                "与洗衣机并行，到点只做颜色提示。", EventStatus.PLANNED, null, false));

        save(event("完成产品方案初稿", EventType.GOAL, Priority.HIGH,
                today.minusDays(3).atTime(9, 0), null, null, null, null,
                "有头无尾的目标；完成后会转成容器，记录实际投入。", EventStatus.PLANNED, null, false));

        save(event("体检预约", EventType.IMPORTANT, Priority.MEDIUM,
                today.plusDays(1).atTime(9, 0), today.plusDays(1).atTime(10, 0), null, null, "校医院",
                "记得空腹。", EventStatus.PLANNED, null, false));

        save(event("数据库复习", EventType.NORMAL, Priority.MEDIUM,
                today.plusDays(1).atTime(15, 0), today.plusDays(1).atTime(16, 0), null, null, null,
                "把事务与索引再过一遍。", EventStatus.PLANNED, null, false));

        LocalDate tripStartDay = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.FRIDAY));
        if (tripStartDay.equals(today) || tripStartDay.isBefore(today)) {
            tripStartDay = tripStartDay.plusWeeks(1);
        }
        save(event("杭州 · 秋日旅行", EventType.NORMAL, Priority.HIGH,
                tripStartDay.atTime(18, 0), tripStartDay.plusDays(2).atTime(20, 0), null, null, "杭州",
                "跨三天两夜的旅行计划，在月视图里会连成一条。", EventStatus.PLANNED, null, false));

        LocalDate nextWednesday = today.with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY));
        save(event("论文选题讨论", EventType.NORMAL, Priority.HIGH,
                nextWednesday.atTime(14, 0), nextWednesday.atTime(15, 0), null, null, "导师办公室",
                "带上三份备选题目。", EventStatus.PLANNED, null, false));

        LocalDate nextThursday = today.with(TemporalAdjusters.next(DayOfWeek.THURSDAY));
        save(event("生日聚餐", EventType.IMPORTANT, Priority.HIGH,
                nextThursday.atTime(19, 0), nextThursday.atTime(21, 0), null, null, "氹仔",
                "重要事件，开始和结束都会强提醒。", EventStatus.PLANNED, null, false));

        profileService.markDemoSeeded();
        log.info("Demo data seeded around {} (now={})", today, now.toLocalTime());
    }

    private ScheduleEvent event(
            String title,
            EventType type,
            Priority priority,
            LocalDateTime start,
            LocalDateTime end,
            LocalDateTime due,
            Long parentId,
            String location,
            String notes,
            EventStatus status,
            LocalDateTime completedAt,
            boolean goalCompleted
    ) {
        ScheduleEvent event = new ScheduleEvent();
        event.setUserId(ProfileService.CURRENT_USER_ID);
        event.setTitle(title);
        event.setType(type);
        event.setPriority(priority);
        event.setStartAt(start);
        event.setEndAt(end);
        event.setDueAt(due);
        event.setParentId(parentId);
        event.setLocation(location);
        event.setNotes(notes);
        event.setStatus(status);
        event.setCompletedAt(completedAt);
        event.setGoalCompleted(goalCompleted);
        return event;
    }

    private ScheduleEvent save(ScheduleEvent event) {
        return repository.save(event);
    }
}
