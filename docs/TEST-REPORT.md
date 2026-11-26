# Test Report

## Environment

- macOS
- Java 21
- Node.js 24
- Python 3.13
- MySQL 9
- Flutter 3.50
- JMeter 5.6

## Automated tests

| Suite | Command | Result |
| --- | --- | --- |
| Python engine | `cd engine && .venv/bin/pytest` | 38 passed |
| Java API | `cd backend && mvn test` | 11 passed |
| Frontend | `cd web && pnpm test` | 17 passed |
| Flutter mobile | `cd mobile && flutter test` | 1 passed |
| Production build | `cd web && pnpm build` | passed |
| Smoke | `./scripts/smoke.sh` | 18 checks passed |

## Covered behavior

- Conflict detection between normal, important, casual and container events.
- Container children can overlap each other and their parent.
- Open goals do not block other events.
- Holiday modes: off, soft warning and avoid.
- Rescheduling suggestions: shift later, trim previous, shift earlier, move following.
- DDL warnings and expected finish time.
- Goal completion converts a goal into a container and records completed time.
- Soft/strong reminder selection based on browser presence.
- Weather mapping, fallback behavior and weather-sensitive event fields.
- Chinese date/time/range parsing, past-time rollover and quick-add defaults.
- Day/week/month layout calculations and cross-day event segmentation.

## Manual checks

- Day, week and month navigation.
- Create, edit, complete and delete events.
- Conflict dialog and applying a suggested change.
- Container children, visual containment and goal completion.
- Weather chip and rainy-day reminder.
- Natural-language quick add, direct creation and form prefill.
- Drag-to-reschedule in the day view.
- Light theme and layout consistency.
- Collapsible sidebar on desktop; drawer on mobile.

## Load test

The JMeter plan is at `tests/jmeter/smartplanner-load.jmx` and covers event reads, overview, holidays, heartbeat, create and delete.

```bash
rm -rf tests/jmeter/report tests/jmeter/results.jtl
jmeter -n -t tests/jmeter/smartplanner-load.jmx \
  -l tests/jmeter/results.jtl \
  -e -o tests/jmeter/report
```
