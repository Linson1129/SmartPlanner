package com.smartplanner.service;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    private static final int ACTIVE_TTL_SECONDS = 20;

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final Clock clock;

    public PresenceService(Clock clock) {
        this.clock = clock;
    }

    /**
     * Records a browser heartbeat and returns whether any visible session has
     * interacted recently. Reminder strength is decided from this aggregate so
     * that an active tab protects the user from a duplicate popup in another tab.
     */
    public boolean heartbeat(String sessionId, boolean active, boolean visible) {
        LocalDateTime now = LocalDateTime.now(clock);
        sessions.put(sessionId, new Session(now, active && visible, visible));
        sessions.entrySet().removeIf(entry ->
                entry.getValue().lastSeen().isBefore(now.minusMinutes(10)));
        return isUserActive();
    }

    public boolean isUserActive() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime cutoff = now.minusSeconds(ACTIVE_TTL_SECONDS);
        return sessions.values().stream()
                .anyMatch(session -> session.active() && session.lastSeen().isAfter(cutoff));
    }

    public int sessionCount() {
        return sessions.size();
    }

    /** Used by tests and by a future explicit logout action. */
    public void clearSessions() {
        sessions.clear();
    }

    private record Session(LocalDateTime lastSeen, boolean active, boolean visible) {
    }
}
