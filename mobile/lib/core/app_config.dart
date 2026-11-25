class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'SMARTPLANNER_API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8080',
  );
}
