package com.smartplanner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NlpParseRequest(
        @NotBlank(message = "请先说一句话")
        @Size(max = 500, message = "一句话不能超过 500 个字符")
        String text
) {
}
