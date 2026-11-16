package com.smartplanner.repository;

import com.smartplanner.domain.EventStatus;
import com.smartplanner.domain.EventType;
import com.smartplanner.domain.ScheduleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ScheduleEventRepository extends JpaRepository<ScheduleEvent, Long> {

    @Query("""
            select e from ScheduleEvent e
            where e.userId = :userId
              and e.startAt < :to
              and (e.endAt is null or e.endAt > :from)
            order by e.startAt asc, e.id asc
            """)
    List<ScheduleEvent> findOverlapping(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
            select e from ScheduleEvent e
            where e.userId = :userId
              and e.startAt < :to
              and (e.endAt is null or e.endAt > :from)
              and e.status not in :excluded
            order by e.startAt asc, e.id asc
            """)
    List<ScheduleEvent> findOverlappingExcludingStatuses(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("excluded") Collection<EventStatus> excluded
    );

    List<ScheduleEvent> findByUserIdOrderByStartAtAsc(Long userId);

    List<ScheduleEvent> findByUserIdAndParentId(Long userId, Long parentId);

    List<ScheduleEvent> findByUserIdAndTypeAndGoalCompletedFalse(Long userId, EventType type);

    long countByUserId(Long userId);

    @Query("""
            select e from ScheduleEvent e
            where e.userId = :userId
              and e.dueAt is not null
              and e.dueAt >= :now
              and e.status not in :excluded
            order by e.dueAt asc
            """)
    List<ScheduleEvent> findUpcomingDeadlines(
            @Param("userId") Long userId,
            @Param("now") LocalDateTime now,
            @Param("excluded") Collection<EventStatus> excluded
    );

    @Query("""
            select e from ScheduleEvent e
            where e.userId = :userId
              and (
                (e.startAt between :from and :to)
                or (e.endAt between :from and :to)
                or (e.dueAt between :from and :to)
                or (e.completedAt between :from and :to)
              )
            """)
    List<ScheduleEvent> findReminderCandidates(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
