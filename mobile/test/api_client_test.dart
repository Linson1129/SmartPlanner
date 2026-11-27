import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:smartplanner_mobile/core/api_client.dart';
import 'package:smartplanner_mobile/models/create_event_input.dart';

void main() {
  test('createEvent posts the expected payload and parses the event', () async {
    late http.Request captured;
    final client = ApiClient(
      baseUrl: 'http://127.0.0.1:8080',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'event': {
              'id': 42,
              'title': '移动端新会议',
              'notes': '',
              'type': 'NORMAL',
              'priority': 'HIGH',
              'status': 'PLANNED',
              'startAt': '2026-11-27T10:00:00',
              'endAt': '2026-11-27T11:00:00',
              'dueAt': null,
              'parentId': null,
              'location': 'A1',
              'weatherSensitive': false,
              'lookaheadDays': 0,
            },
            'analysis': {
              'engineAvailable': true,
              'conflicts': [],
              'holidayWarnings': [],
              'deadlineWarning': null,
              'suggestions': [],
            },
          }),
          201,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    final event = await client.createEvent(
      CreateEventInput(
        title: '移动端新会议',
        type: 'NORMAL',
        priority: 'HIGH',
        startAt: DateTime(2026, 11, 27, 10),
        endAt: DateTime(2026, 11, 27, 11),
        location: 'A1',
      ),
    );

    expect(captured.method, 'POST');
    expect(captured.url.path, '/api/events');
    final body = jsonDecode(captured.body) as Map<String, dynamic>;
    expect(body['title'], '移动端新会议');
    expect(body['startAt'], '2026-11-27T10:00:00');
    expect(body['endAt'], '2026-11-27T11:00:00');
    expect(event.id, 42);
    expect(event.title, '移动端新会议');
    expect(event.priority, 'HIGH');
  });

  test('eventsForRange requests the selected week window', () async {
    late http.Request captured;
    final client = ApiClient(
      baseUrl: 'http://127.0.0.1:8080',
      client: MockClient((request) async {
        captured = request;
        return http.Response('[]', 200,
            headers: {'content-type': 'application/json'});
      }),
    );

    final events = await client.eventsForRange(
      DateTime(2026, 11, 23),
      DateTime(2026, 11, 30),
    );

    expect(events, isEmpty);
    expect(captured.url.path, '/api/events');
    expect(captured.url.queryParameters['from'], '2026-11-23T00:00:00');
    expect(captured.url.queryParameters['to'], '2026-11-30T00:00:00');
  });

  test('updateEvent puts the event payload and parses the result', () async {
    late http.Request captured;
    final client = ApiClient(
      baseUrl: 'http://127.0.0.1:8080',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'event': {
              'id': 7,
              'title': '团队同步（改期）',
              'notes': '',
              'type': 'NORMAL',
              'priority': 'MEDIUM',
              'status': 'PLANNED',
              'startAt': '2026-11-27T10:00:00',
              'endAt': '2026-11-27T11:00:00',
              'dueAt': null,
              'parentId': null,
              'location': null,
              'weatherSensitive': false,
              'lookaheadDays': 0,
            },
            'analysis': {
              'engineAvailable': true,
              'conflicts': [],
              'holidayWarnings': [],
              'deadlineWarning': null,
              'suggestions': [],
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    final event = await client.updateEvent(
      7,
      CreateEventInput(
        title: '团队同步（改期）',
        type: 'NORMAL',
        priority: 'MEDIUM',
        startAt: DateTime(2026, 11, 27, 10),
        endAt: DateTime(2026, 11, 27, 11),
      ),
    );

    expect(captured.method, 'PUT');
    expect(captured.url.path, '/api/events/7');
    expect(jsonDecode(captured.body)['title'], '团队同步（改期）');
    expect(event.title, '团队同步（改期）');
  });

  test('completeEvent patches the complete endpoint', () async {
    late http.Request captured;
    final client = ApiClient(
      baseUrl: 'http://127.0.0.1:8080',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'id': 7,
            'title': '团队同步',
            'notes': '',
            'type': 'NORMAL',
            'priority': 'MEDIUM',
            'status': 'DONE',
            'startAt': '2026-11-27T10:00:00',
            'endAt': '2026-11-27T11:00:00',
            'dueAt': null,
            'parentId': null,
            'location': null,
            'weatherSensitive': false,
            'lookaheadDays': 0,
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    final event = await client.completeEvent(7);
    expect(captured.method, 'PATCH');
    expect(captured.url.path, '/api/events/7/complete');
    expect(event.status, 'DONE');
  });

  test('deleteEvent calls the event endpoint and parses the result', () async {
    late http.Request captured;
    final client = ApiClient(
      baseUrl: 'http://127.0.0.1:8080',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({'id': 7, 'detachedChildren': 0}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    final result = await client.deleteEvent(7);
    expect(captured.method, 'DELETE');
    expect(captured.url.path, '/api/events/7');
    expect(result.id, 7);
    expect(result.detachedChildren, 0);
  });
}
