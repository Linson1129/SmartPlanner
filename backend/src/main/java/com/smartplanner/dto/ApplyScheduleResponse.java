package com.smartplanner.dto;

import java.util.List;

public record ApplyScheduleResponse(List<EventDto> events, AnalysisDto analysis) {
}
