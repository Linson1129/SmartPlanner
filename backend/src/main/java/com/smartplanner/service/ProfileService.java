package com.smartplanner.service;

import com.smartplanner.common.BadRequestException;
import com.smartplanner.domain.UserProfile;
import com.smartplanner.domain.WeatherProvince;
import com.smartplanner.dto.ProfileDto;
import com.smartplanner.dto.ProfileUpdateRequest;
import com.smartplanner.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Service
public class ProfileService {

    public static final Long CURRENT_USER_ID = 1L;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final UserProfileRepository repository;
    private final Clock clock;

    public ProfileService(UserProfileRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public UserProfile getOrCreate() {
        return repository.findById(CURRENT_USER_ID).orElseGet(() -> {
            UserProfile profile = new UserProfile();
            profile.setId(CURRENT_USER_ID);
            return repository.save(profile);
        });
    }

    public ProfileDto getDto() {
        return toDto(getOrCreate());
    }

    @Transactional
    public ProfileDto update(ProfileUpdateRequest request) {
        UserProfile profile = getOrCreate();
        LocalTime expectedFinishTime;
        try {
            expectedFinishTime = LocalTime.parse(request.expectedFinishTime(), TIME_FORMAT);
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("预期收工时间格式应为 HH:mm");
        }
        profile.setDisplayName(request.displayName().trim());
        profile.setExpectedFinishTime(expectedFinishTime);
        profile.setHolidayMode(request.holidayMode());
        profile.setHolidayRegion(request.holidayRegion());
        profile.setWeatherProvince(request.weatherProvince());
        profile.setIdleThresholdSeconds(request.idleThresholdSeconds());
        return toDto(repository.save(profile));
    }

    @Transactional
    public void markDemoSeeded() {
        UserProfile profile = getOrCreate();
        profile.setDemoSeeded(true);
        repository.save(profile);
    }

    public LocalDateTime expectedFinishAt(LocalDate date) {
        return date.atTime(getOrCreate().getExpectedFinishTime());
    }

    public LocalDateTime todayExpectedFinishAt() {
        return expectedFinishAt(LocalDate.now(clock));
    }

    public ProfileDto toDto(UserProfile profile) {
        LocalDate today = LocalDate.now(clock);
        return new ProfileDto(
                profile.getDisplayName(),
                profile.getExpectedFinishTime().format(TIME_FORMAT),
                today.atTime(profile.getExpectedFinishTime()),
                profile.getHolidayMode(),
                profile.getHolidayRegion(),
                profile.getWeatherProvince() == null ? WeatherProvince.MACAU : profile.getWeatherProvince(),
                profile.getIdleThresholdSeconds(),
                profile.isDemoSeeded()
        );
    }
}
