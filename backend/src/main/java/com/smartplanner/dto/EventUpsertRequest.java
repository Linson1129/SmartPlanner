package com.smartplanner.dto;

import com.smartplanner.domain.EventType;
import com.smartplanner.domain.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record EventUpsertRequest(
        @NotBlank(message = "请填写事件名称")
        @Size(max = 200, message = "事件名称不能超过 200 个字符")
        String title,

        @Size(max = 4000, message = "备注不能超过 4000 个字符")
        String notes,

        @NotNull(message = "请选择事件类型")
        EventType type,

        @NotNull(message = "请选择优先级")
        Priority priority,

        @NotNull(message = "请选择开始时间")
        LocalDateTime startAt,

        LocalDateTime endAt,

        LocalDateTime dueAt,

        Long parentId,

        @Size(max = 200, message = "地点不能超过 200 个字符")
        String location,

        Boolean weatherSensitive,

        Integer lookaheadDays
) {
}
