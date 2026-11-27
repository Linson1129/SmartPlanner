import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smartplanner_mobile/app.dart';
import 'package:smartplanner_mobile/core/planner_repository.dart';
import 'package:smartplanner_mobile/models/create_event_input.dart';
import 'package:smartplanner_mobile/models/delete_result.dart';
import 'package:smartplanner_mobile/models/schedule_event.dart';

class FakePlannerRepository implements PlannerRepository {
  final created = <CreateEventInput>[];
  final completedIds = <int>[];
  final deletedIds = <int>[];
  final updatedIds = <int>[];
  final _events = <ScheduleEvent>[
    ScheduleEvent(
      id: 1,
      title: '团队同步',
      type: 'IMPORTANT',
      priority: 'HIGH',
      status: 'PLANNED',
      startAt: DateTime(2026, 11, 27, 10),
      endAt: DateTime(2026, 11, 27, 11),
      location: '会议室',
    ),
  ];

  @override
  Future<List<ScheduleEvent>> eventsForDay(DateTime day) async => _events;

  @override
  Future<List<ScheduleEvent>> eventsForRange(
    DateTime from,
    DateTime to,
  ) async {
    return _events
        .where((event) =>
            !event.startAt.isBefore(from) && event.startAt.isBefore(to))
        .toList();
  }

  @override
  Future<ScheduleEvent> createEvent(CreateEventInput input) async {
    created.add(input);
    final event = ScheduleEvent(
      id: 2,
      title: input.title,
      type: input.type,
      priority: input.priority,
      status: 'PLANNED',
      startAt: input.startAt,
      endAt: input.endAt,
      location: input.location,
    );
    _events.add(event);
    return event;
  }

  @override
  Future<ScheduleEvent> updateEvent(int id, CreateEventInput input) async {
    updatedIds.add(id);
    final index = _events.indexWhere((event) => event.id == id);
    final current = _events[index];
    final updated = ScheduleEvent(
      id: current.id,
      title: input.title,
      type: input.type,
      priority: input.priority,
      status: current.status,
      startAt: input.startAt,
      endAt: input.endAt,
      location: input.location,
    );
    _events[index] = updated;
    return updated;
  }

  @override
  Future<ScheduleEvent> completeEvent(int id) async {
    completedIds.add(id);
    final index = _events.indexWhere((event) => event.id == id);
    final event = _events[index];
    final completed = ScheduleEvent(
      id: event.id,
      title: event.title,
      type: event.type,
      priority: event.priority,
      status: 'DONE',
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
    );
    _events[index] = completed;
    return completed;
  }

  @override
  Future<DeleteResult> deleteEvent(int id) async {
    deletedIds.add(id);
    _events.removeWhere((event) => event.id == id);
    return DeleteResult(id: id, detachedChildren: 0);
  }
}

void main() {
  testWidgets('shows the week view with the current week events',
      (tester) async {
    await tester.pumpWidget(
      SmartPlannerApp(repository: FakePlannerRepository()),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('周视图').last);
    await tester.pumpAndSettle();

    expect(find.text('周三'), findsOneWidget);
    expect(find.text('团队同步'), findsOneWidget);
    expect(find.text('11 月 23 日 — 11 月 29 日'), findsOneWidget);
  });

  testWidgets('shows the mobile skeleton and today event', (tester) async {
    await tester.pumpWidget(
      SmartPlannerApp(repository: FakePlannerRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.text('SmartPlanner'), findsOneWidget);
    expect(find.text('今天'), findsWidgets);
    expect(find.text('团队同步'), findsOneWidget);
    expect(find.text('10:00 - 11:00'), findsOneWidget);
  });

  testWidgets('creates an event from the mobile form', (tester) async {
    final repository = FakePlannerRepository();
    await tester.pumpWidget(SmartPlannerApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('新建事件'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('event-title')),
      '移动端新会议',
    );
    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();

    expect(repository.created, hasLength(1));
    expect(repository.created.single.title, '移动端新会议');
    expect(find.text('移动端新会议'), findsOneWidget);
  });

  testWidgets('edits an event from the detail sheet', (tester) async {
    final repository = FakePlannerRepository();
    await tester.pumpWidget(SmartPlannerApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('团队同步'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('编辑'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('event-title')),
      '团队同步（改期）',
    );
    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();

    expect(repository.updatedIds, [1]);
    expect(find.text('团队同步（改期）'), findsOneWidget);
  });

  testWidgets('completes an event from the detail sheet', (tester) async {
    final repository = FakePlannerRepository();
    await tester.pumpWidget(SmartPlannerApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('团队同步'));
    await tester.pumpAndSettle();
    expect(find.text('标记完成'), findsOneWidget);

    await tester.tap(find.text('标记完成'));
    await tester.pumpAndSettle();

    expect(repository.completedIds, [1]);
  });

  testWidgets('deletes an event from the detail sheet', (tester) async {
    final repository = FakePlannerRepository();
    await tester.pumpWidget(SmartPlannerApp(repository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('团队同步'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('删除'));
    await tester.pumpAndSettle();
    expect(find.text('删除这个事件？'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, '删除'));
    await tester.pumpAndSettle();

    expect(repository.deletedIds, [1]);
    expect(find.text('团队同步'), findsNothing);
  });
}
