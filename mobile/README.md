# SmartPlanner Mobile

Flutter client skeleton for SmartPlanner.

## Scope

- Material 3 application shell
- Today, Week, and Settings navigation destinations
- Typed event model and HTTP client
- Today event list with loading, error, empty, and refresh states
- Create and edit event bottom sheet with title, type, priority, start/end time, and location
- Event detail sheet with completion and deletion actions
- Widget test with an injected repository

The Week and Settings screens are placeholders for the next mobile iteration. The Web application remains the reference implementation.

## Run

```bash
cd mobile
flutter pub get
flutter test
flutter run --dart-define=SMARTPLANNER_API_BASE_URL=http://127.0.0.1:8080
```

For an Android emulator, use `http://10.0.2.2:8080` as the API base URL. For a physical device, use the development machine's LAN address.

Android and iOS platform shells are included. After changing the Flutter SDK version, regenerate them with:

```bash
flutter create --platforms=android,ios .
```

## Structure

```text
lib/
  app.dart
  main.dart
  core/
    api_client.dart
    app_config.dart
    planner_repository.dart
  features/
    create/event_form_sheet.dart
    detail/event_detail_sheet.dart
    today/today_page.dart
    placeholders/placeholder_page.dart
  models/schedule_event.dart
test/
  widget_test.dart
```
