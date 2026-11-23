# SmartPlanner UI and Color Reference

## UI sources

The interface is implemented in this repository. No purchased template or downloaded HTML theme is used.

| Resource | Version | Usage | Link | License |
| --- | --- | --- | --- | --- |
| Material UI (MUI) | 9.5.0 | App bar, tabs, buttons, lists, drawer, dialogs, text fields, switches, chips, alerts, progress | https://mui.com/material-ui/ | MIT |
| Emotion | 11 | MUI style engine | https://emotion.sh/ | MIT |
| Lucide | 0.468.0 | Interface icons | https://lucide.dev/ | ISC |
| Next.js | 15 | React application framework | https://nextjs.org/ | MIT |
| React | 19 | Component runtime | https://react.dev/ | MIT |
| date-fns | 4 | Date formatting and calculations | https://date-fns.org/ | MIT |

Fonts use the operating-system UI stack: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Arial`, `PingFang SC`, and `Noto Sans SC`. No web font is downloaded.

### Custom interface work

The day, week, and month time grids are custom layouts built with React and CSS. MUI does not provide a Gantt or multi-column time-grid component, so the project uses MUI for the application shell and forms, and custom CSS for the calendar canvas.

MUI components used:

- `AppBar`-style header built with `Tabs`, `Button`, `IconButton`, and `Chip`
- `Drawer`, `List`, `ListItemButton`, `Avatar`, `LinearProgress`, and `Card` in the sidebar
- `Drawer` with `TextField`, `Select`, `Switch`, and `ToggleButtonGroup` for event editing
- `Dialog` for conflict, settings, and quick-add flows
- `Snackbar`-style feedback implemented with `Alert` and `Stack`
- `Chip`, `Card`, and `LinearProgress` for weather and DDL summaries

## Theme name

Minimal Slate

The interface uses a single light theme: neutral surfaces, one blue primary color, a navy navigation surface, and a small set of semantic event colors.

## Core palette

| Token | Value | Usage |
| --- | --- | --- |
| `--paper` | `#F6F7F9` | Page background |
| `--surface` | `#FFFFFF` | Cards, dialogs, panels |
| `--surface-soft` | `#F8FAFC` | Secondary surfaces, table headers |
| `--ink` | `#111827` | Primary text |
| `--ink-soft` | `#374151` | Strong secondary text |
| `--muted` | `#6B7280` | Secondary text |
| `--line` | `#E5E7EB` | Borders and dividers |
| `--line-soft` | `#F1F5F9` | Subtle grid lines |
| `--accent` | `#2563EB` | Primary action |
| `--accent-deep` | `#1D4ED8` | Primary hover and emphasis |
| `--accent-soft` | `#EFF6FF` | Selected state and soft emphasis |
| Sidebar surface | `#0F172A` | Navigation column |

## Semantic palette

| Token | Value | Usage |
| --- | --- | --- |
| Success | `#059669` | Online and completion |
| Warning | `#D97706` | Warnings, casual events |
| Error | `#DC2626` | Errors, important events |
| Container blue | `#2563EB` | Container events |
| Goal violet | `#7C3AED` | Goal events |

## Event palette

| Event type | Foreground | Background |
| --- | --- | --- |
| Normal | `#475569` | `#F1F5F9` |
| Important | `#FFFFFF` | `#DC2626` |
| Casual | `#92400E` | `#FFFBEB` |
| Container | `#1E40AF` | `#EFF6FF` |
| Goal | `#5B21B6` | `#F5F3FF` |

## MUI theme mapping

| MUI palette key | Value |
| --- | --- |
| `primary.main` | `#2563EB` |
| `secondary.main` | `#475569` |
| `background.default` | `#F6F7F9` |
| `background.paper` | `#FFFFFF` |
| `text.primary` | `#111827` |
| `text.secondary` | `#64748B` |

MUI defaults are adjusted in `web/components/mui-provider.tsx`; the custom calendar tokens are declared in `web/app/styles/minimal.css`.

## CSS variable file map

| File | Responsibility |
| --- | --- |
| `web/app/styles/minimal.css` | Color tokens, flat surfaces, event colors, component overrides |
| `web/app/styles/shell.css` | Application shell, sidebar, and top bar layout |
| `web/app/styles/views.css` | Day, week, and month calendar layouts |
| `web/app/styles/panels.css` | Event panel, dialogs, reminders, and settings |

## Contrast notes

- Primary text `#111827` on `#FFFFFF` is approximately 17.5:1.
- White text on the primary `#2563EB` is approximately 5.2:1.
- Secondary text `#6B7280` on `#FFFFFF` is approximately 4.8:1.

These values meet the WCAG AA threshold for normal text.
