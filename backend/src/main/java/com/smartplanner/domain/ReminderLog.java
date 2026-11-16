package com.smartplanner.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "reminder_log",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_reminder_event_occurrence_strength",
                columnNames = {"event_id", "occurrence_key", "strength"}
        ),
        indexes = @Index(name = "idx_reminder_event", columnList = "event_id")
)
@Getter
@Setter
@NoArgsConstructor
public class ReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "occurrence_key", nullable = false, length = 80)
    private String occurrenceKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ReminderStrength strength;

    @Column(name = "delivered_at", nullable = false)
    private LocalDateTime deliveredAt;

    public ReminderLog(Long eventId, String occurrenceKey, ReminderStrength strength, LocalDateTime deliveredAt) {
        this.eventId = eventId;
        this.occurrenceKey = occurrenceKey;
        this.strength = strength;
        this.deliveredAt = deliveredAt;
    }
}
