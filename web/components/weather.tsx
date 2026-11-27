"use client";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Umbrella } from "lucide-react";
import type { WeatherDay } from "@/lib/types";

export function WeatherIcon({ code, size = 14 }: { code: number; size?: number }) {
  const props = { size, strokeWidth: 1.8 } as const;
  if (code === 0) return <Sun {...props} />;
  if (code === 1 || code === 2) return <CloudSun {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  if (code >= 51) return <CloudRain {...props} />;
  return <CloudSun {...props} />;
}

export function WeatherChip({ day, city, compact = false }: { day: WeatherDay; city?: string | null; compact?: boolean }) {
  const rain = day.precipitationProbability ?? 0;
  const wet = day.rainy || day.snowy || day.stormy;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={wet ? "info" : "default"}
      icon={<WeatherIcon code={day.code} size={compact ? 12 : 14} />}
      label={(
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          {!compact && city ? <Typography component="span" sx={{ fontSize: 10, color: "text.secondary" }}>{city}</Typography> : null}
          {!compact ? <Typography component="span" sx={{ fontSize: 11 }}>{day.condition}</Typography> : null}
          {day.tempMax !== null ? <Typography component="span" sx={{ fontSize: 11, fontWeight: 700 }}>{Math.round(day.tempMax)}°</Typography> : null}
          {rain > 0 ? (
            <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
              <Umbrella size={10} />
              <Typography component="span" sx={{ fontSize: 10 }}>{rain}%</Typography>
            </Stack>
          ) : null}
        </Stack>
      )}
      title={`${city ? `${city} · ` : ""}${day.condition} · ${day.tempMin ?? "-"}–${day.tempMax ?? "-"}°C · 降雨 ${rain}%`}
      sx={{ height: 28, "& .MuiChip-icon": { ml: 0.75 } }}
    />
  );
}

export function weatherIsWet(day: WeatherDay | null | undefined): boolean {
  return !!day && (day.rainy || day.snowy || day.stormy || (day.precipitationProbability ?? 0) >= 50);
}
