package com.smartplanner.dto;

import com.smartplanner.domain.HolidayMode;
import com.smartplanner.domain.HolidayRegion;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank(message = "请填写称呼")
        @Size(max = 60, message = "称呼不能超过 60 个字符")
        String displayName,

        @NotBlank(message = "请设置预期收工时间")
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "预期收工时间格式应为 HH:mm")
        String expectedFinishTime,

        @NotNull HolidayMode holidayMode,
        @NotNull HolidayRegion holidayRegion,
        @Min(value = 20, message = "活跃判定不能少于 20 秒")
        @Max(value = 600, message = "活跃判定不能超过 600 秒")
        int idleThresholdSeconds
) {
}
