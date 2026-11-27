package com.smartplanner.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "user_profile")
@Getter
@Setter
@NoArgsConstructor
public class UserProfile {

    @Id
    private Long id = 1L;

    @Column(nullable = false, length = 60)
    private String displayName = "JinHeng";

    @Column(name = "expected_finish_time", nullable = false)
    private LocalTime expectedFinishTime = LocalTime.of(22, 0);

    @Enumerated(EnumType.STRING)
    @Column(name = "holiday_mode", nullable = false, length = 10)
    private HolidayMode holidayMode = HolidayMode.SOFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "holiday_region", nullable = false, length = 10)
    private HolidayRegion holidayRegion = HolidayRegion.MO;

    @Enumerated(EnumType.STRING)
    @Column(name = "weather_province", length = 30)
    private WeatherProvince weatherProvince = WeatherProvince.MACAU;

    @Column(name = "idle_threshold_seconds", nullable = false)
    private int idleThresholdSeconds = 90;

    @Column(name = "demo_seeded", nullable = false)
    private boolean demoSeeded = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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
}
