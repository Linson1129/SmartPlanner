import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/schedule_event.dart';
import 'app_config.dart';

class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    http.Client? client,
    this.baseUrl = AppConfig.apiBaseUrl,
  }) : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;

  Future<List<ScheduleEvent>> eventsForDay(DateTime day) async {
    final start = DateTime(day.year, day.month, day.day);
    final end = start.add(const Duration(days: 1));
    final uri = Uri.parse('$baseUrl/api/events').replace(
      queryParameters: {
        'from': _apiDate(start),
        'to': _apiDate(end),
      },
    );

    try {
      final response = await _client.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException('服务返回 ${response.statusCode}');
      }
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is! List) {
        throw const ApiException('事件数据格式不正确');
      }
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(ScheduleEvent.fromJson)
          .toList();
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException('无法连接 SmartPlanner 服务');
    }
  }

  void close() {
    _client.close();
  }

  String _apiDate(DateTime value) {
    String two(int number) => number.toString().padLeft(2, '0');
    return '${value.year}-${two(value.month)}-${two(value.day)}T00:00:00';
  }
}
