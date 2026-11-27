import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEATHER_PROVINCE,
  WEATHER_PROVINCES,
  weatherProvinceLabel,
} from "../lib/weather-provinces";

describe("weather provinces", () => {
  it("covers every province-level region exactly once", () => {
    expect(WEATHER_PROVINCES).toHaveLength(34);
    expect(new Set(WEATHER_PROVINCES.map((item) => item.code)).size).toBe(34);
    expect(WEATHER_PROVINCES.some((item) => item.code === DEFAULT_WEATHER_PROVINCE)).toBe(true);
  });

  it("resolves labels and falls back to Macau", () => {
    expect(weatherProvinceLabel("BEIJING")).toBe("北京");
    expect(weatherProvinceLabel("MACAU")).toBe("澳门");
    expect(weatherProvinceLabel("UNKNOWN")).toBe("澳门");
  });
});
