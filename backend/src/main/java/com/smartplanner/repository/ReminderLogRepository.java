package com.smartplanner.repository;

import com.smartplanner.domain.ReminderLog;
import com.smartplanner.domain.ReminderStrength;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReminderLogRepository extends JpaRepository<ReminderLog, Long> {

    boolean existsByEventIdAndOccurrenceKeyAndStrength(
            Long eventId,
            String occurrenceKey,
            ReminderStrength strength
    );

    void deleteByEventId(Long eventId);
}
