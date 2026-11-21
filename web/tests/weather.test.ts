import { describe, expect, it } from "vitest";
import { weatherIsWet } from "@/components/weather";
import type { WeatherDay } from "@/lib/types";

const base: WeatherDay = {
  date: "2026-11-07",
  code: 1,
  condition: "大致晴朗",
  tempMax: 27,
  tempMin: 21,
  precipitationProbability: 10,
  windSpeedMax: 12,
  rainy: false,
  snowy: false,
  stormy: false,
};

describe("weatherIsWet", () => {
  it("treats rain, snow and storms as wet", () => {
    expect(weatherIsWet({ ...base, rainy: true })).toBe(true);
    expect(weatherIsWet({ ...base, snowy: true })).toBe(true);
    expect(weatherIsWet({ ...base, stormy: true })).toBe(true);
  });

  it("treats high precipitation probability as wet even without a wet code", () => {
    expect(weatherIsWet({ ...base, precipitationProbability: 50 })).toBe(true);
    expect(weatherIsWet({ ...base, precipitationProbability: 49 })).toBe(false);
  });

  it("handles no forecast", () => {
    expect(weatherIsWet(null)).toBe(false);
    expect(weatherIsWet(undefined)).toBe(false);
  });
});
