package com.smartplanner.service;

import com.smartplanner.common.BadRequestException;
import com.smartplanner.common.EngineUnavailableException;
import com.smartplanner.dto.EngineDtos;
import com.smartplanner.domain.WeatherProvince;
import com.smartplanner.dto.WeatherDto;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WeatherService {

    private static final int MAX_DAYS = 15;
    private static final Duration TTL = Duration.ofMinutes(30);

    private final EngineClient engineClient;
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public WeatherService(EngineClient engineClient) {
        this.engineClient = engineClient;
    }

    public WeatherDto forecast(LocalDate from, LocalDate to, WeatherProvince province) {
        if (to.isBefore(from)) {
            throw new BadRequestException("天气日期范围不正确");
        }
        if (from.plusDays(MAX_DAYS - 1).isBefore(to)) {
            throw new BadRequestException("天气最多查询未来 15 天");
        }
        String key = from + ":" + to + ":" + province.name();
        CacheEntry cached = cache.get(key);
        if (cached != null && cached.createdAt().plus(TTL).isAfter(Instant.now())) {
            return cached.value();
        }
        try {
            EngineDtos.WeatherResponse response = engineClient.weather(
                    from,
                    to,
                    province.latitude(),
                    province.longitude(),
                    province.timezone(),
                    province.label()
            );
            List<WeatherDto.Day> days = response.days() == null ? List.of() : response.days().stream()
                    .map(day -> new WeatherDto.Day(
                            day.date(),
                            day.code(),
                            day.condition(),
                            day.tempMax(),
                            day.tempMin(),
                            day.precipitationProbability(),
                            day.windSpeedMax(),
                            day.rainy(),
                            day.snowy(),
                            day.stormy()
                    ))
                    .toList();
            WeatherDto value = new WeatherDto(
                    response.available(),
                    response.city() == null ? province.label() : response.city(),
                    response.latitude(),
                    response.longitude(),
                    response.timezone() == null ? province.timezone() : response.timezone(),
                    days,
                    response.message(),
                    response.fetchedAt()
            );
            cache.put(key, new CacheEntry(Instant.now(), value));
            return value;
        } catch (EngineUnavailableException ex) {
            return new WeatherDto(
                    false,
                    province.label(),
                    province.latitude(),
                    province.longitude(),
                    province.timezone(),
                    List.of(),
                    ex.getMessage(),
                    null
            );
        }
    }

    private record CacheEntry(Instant createdAt, WeatherDto value) {
    }
}
