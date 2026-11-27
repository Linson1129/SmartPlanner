import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smartplanner_mobile/app.dart';
import 'package:smartplanner_mobile/core/planner_repository.dart';
import 'package:smartplanner_mobile/models/create_event_input.dart';
import 'package:smartplanner_mobile/models/schedule_event.dart';

class FakePlannerRepository implements PlannerRepository {
  final created = <CreateEventInput>[];
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
}

void main() {
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
      find.byKey(const ValueKey('create-title')),
      '移动端新会议',
    );
    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();

    expect(repository.created, hasLength(1));
    expect(repository.created.single.title, '移动端新会议');
    expect(find.text('移动端新会议'), findsOneWidget);
  });
}
