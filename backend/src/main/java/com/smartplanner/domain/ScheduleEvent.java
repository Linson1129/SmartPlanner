package com.smartplanner.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "schedule_event",
        indexes = {
                @Index(name = "idx_event_user_start", columnList = "user_id,start_at"),
                @Index(name = "idx_event_user_due", columnList = "user_id,due_at"),
                @Index(name = "idx_event_parent", columnList = "parent_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class ScheduleEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId = 1L;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 4000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 20)
    private EventType type = EventType.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status = EventStatus.PLANNED;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(length = 200)
    private String location;

    @Column(name = "goal_completed", nullable = false)
    private boolean goalCompleted = false;

    @Column(name = "weather_sensitive", nullable = false, columnDefinition = "bit(1) default 0")
    private boolean weatherSensitive = false;

    @Column(name = "lookahead_days", nullable = false, columnDefinition = "int default 0")
    private int lookaheadDays = 0;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isOpenGoal() {
        return type == EventType.GOAL && endAt == null;
    }
}
