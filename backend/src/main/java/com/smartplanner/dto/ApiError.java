package com.smartplanner.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ApiError(
        String code,
        String message,
        Map<String, String> fields,
        LocalDateTime timestamp
) {
    public static ApiError of(String code, String message) {
        return new ApiError(code, message, Map.of(), LocalDateTime.now());
    }

    public static ApiError of(String code, String message, Map<String, String> fields) {
        return new ApiError(code, message, fields, LocalDateTime.now());
    }
}
