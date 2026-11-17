package com.smartplanner.service;

import com.smartplanner.common.EngineUnavailableException;
import com.smartplanner.domain.HolidayRegion;
import com.smartplanner.dto.EngineDtos;
import com.smartplanner.dto.HolidayCalendarDto;
import com.smartplanner.dto.HolidayDto;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class HolidayService {

    private static final Duration TTL = Duration.ofMinutes(30);

    private final EngineClient engineClient;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public HolidayService(EngineClient engineClient) {
        this.engineClient = engineClient;
    }

    public HolidayCalendarDto calendar(int year, HolidayRegion region) {
        String key = year + ":" + region.name();
        CacheEntry cached = cache.get(key);
        if (cached != null && cached.createdAt().plus(TTL).isAfter(Instant.now())) {
            return cached.value();
        }
        try {
            EngineDtos.HolidayResponse response = engineClient.holidays(year, region.name());
            List<HolidayDto> entries = response.holidays() == null ? List.of() : response.holidays().stream()
                    .map(item -> new HolidayDto(item.date(), item.name(), item.kind(), item.region()))
                    .toList();
            HolidayCalendarDto value = new HolidayCalendarDto(year, region.name(), true, entries);
            cache.put(key, new CacheEntry(Instant.now(), value));
            return value;
        } catch (EngineUnavailableException ex) {
            return new HolidayCalendarDto(year, region.name(), false, List.of());
        }
    }

    public HolidayDto holidayOn(LocalDate date, HolidayRegion region) {
        return calendar(date.getYear(), region).holidays().stream()
                .filter(item -> date.toString().equals(item.date()))
                .filter(item -> "PUBLIC_HOLIDAY".equals(item.kind()))
                .findFirst()
                .orElse(null);
    }

    private record CacheEntry(Instant createdAt, HolidayCalendarDto value) {
    }
}
